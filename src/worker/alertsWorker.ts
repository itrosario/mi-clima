/**
 * API publica de suscripciones a avisos y disparador del monitor.
 *
 * No hay cuentas ni datos de ubicacion: el navegador entrega su suscripcion
 * push y la estacion elegida. La API solo acepta endpoints de servicios push
 * conocidos y responde siempre sin cache.
 */

import { isRecord } from "@/infrastructure/parsing/jsonValues";
import {
  deleteSubscription,
  parseSubscriptionPayload,
  readSubscription,
  saveSubscription,
} from "./alertStore";
import type { AlertKvNamespace, AlertWorkerEnvironment } from "./alertTypes";
import { jsonResponse, type WorkerCache } from "./edgeCache";
import { runFloodMonitor } from "./floodMonitor";
import { loadVapidKeys, type VapidKeyPair } from "./vapid";

export const alertsBasePath = "/api/alertas";
export const alertsVapidPath = `${alertsBasePath}/vapid`;
export const alertsSubscribePath = `${alertsBasePath}/suscripcion`;
export const alertsUnsubscribePath = `${alertsBasePath}/baja`;

const maximumBodyLength = 8 * 1024;
const maximumEndpointLength = 2048;

export interface AlertWorkerDependencies {
  readonly kv?: AlertKvNamespace | null;
  readonly environment?: AlertWorkerEnvironment;
  readonly now?: () => Date;
  readonly vapidKeys?: VapidKeyPair | null;
}

export interface ScheduledControllerLike {
  readonly scheduledTime: number;
}

export interface ScheduledContextLike {
  waitUntil(promise: Promise<unknown>): void;
}

export interface AlertScheduleDependencies {
  readonly cache?: WorkerCache | null;
  readonly runMonitor?: typeof runFloodMonitor;
}

type BodyResult =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly status: number; readonly error: string };

export function isAlertsPath(pathname: string): boolean {
  return pathname === alertsBasePath || pathname.startsWith(`${alertsBasePath}/`);
}

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");

  return origin === null || origin === new URL(request.url).origin;
}

async function readJsonBody(request: Request): Promise<BodyResult> {
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().startsWith("application/json")) {
    return { ok: false, status: 415, error: "invalid_content_type" };
  }

  const text = await request.text();

  if (text.length > maximumBodyLength) {
    return { ok: false, status: 413, error: "body_too_large" };
  }

  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, status: 400, error: "invalid_json" };
  }
}

function unavailableResponse(): Response {
  return jsonResponse({ error: "alerts_unavailable" }, 503, 0);
}

async function handleVapid(
  dependencies: AlertWorkerDependencies,
  kv: AlertKvNamespace,
  environment: AlertWorkerEnvironment,
): Promise<Response> {
  const keys =
    dependencies.vapidKeys === undefined
      ? await loadVapidKeys(kv, environment)
      : dependencies.vapidKeys;

  if (keys === null) {
    return unavailableResponse();
  }

  return jsonResponse({ publicKey: keys.publicKey }, 200, 0);
}

async function handleSubscribe(
  request: Request,
  dependencies: AlertWorkerDependencies,
  kv: AlertKvNamespace,
): Promise<Response> {
  if (!isSameOrigin(request)) {
    return jsonResponse({ error: "origin_not_allowed" }, 403, 0);
  }

  const body = await readJsonBody(request);

  if (!body.ok) {
    return jsonResponse({ error: body.error }, body.status, 0);
  }

  const now = (dependencies.now ?? (() => new Date()))();
  const parsed = parseSubscriptionPayload(body.value, now);

  if (parsed === null) {
    return jsonResponse({ error: "invalid_subscription" }, 400, 0);
  }

  const existing = await readSubscription(kv, parsed.endpoint);
  const timestamp = now.toISOString();
  const subscription = {
    ...parsed,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };

  await saveSubscription(kv, subscription);

  return jsonResponse({ ok: true, stationIds: subscription.stationIds }, 201, 0);
}

async function handleUnsubscribe(request: Request, kv: AlertKvNamespace): Promise<Response> {
  if (!isSameOrigin(request)) {
    return jsonResponse({ error: "origin_not_allowed" }, 403, 0);
  }

  const body = await readJsonBody(request);

  if (!body.ok) {
    return jsonResponse({ error: body.error }, body.status, 0);
  }

  const endpoint = isRecord(body.value) ? body.value.endpoint : undefined;

  if (
    typeof endpoint !== "string" ||
    endpoint.length === 0 ||
    endpoint.length > maximumEndpointLength
  ) {
    return jsonResponse({ error: "invalid_endpoint" }, 400, 0);
  }

  await deleteSubscription(kv, endpoint);

  return jsonResponse({ ok: true }, 200, 0);
}

export async function handleAlertRequest(
  request: Request,
  dependencies: AlertWorkerDependencies = {},
): Promise<Response> {
  const { pathname } = new URL(request.url);
  const environment = dependencies.environment ?? {};
  const kv = dependencies.kv ?? environment.ALERTS ?? null;

  if (pathname === alertsVapidPath) {
    if (request.method !== "GET") {
      return jsonResponse({ error: "method_not_allowed" }, 405, 0);
    }

    if (kv === null) {
      return unavailableResponse();
    }

    return handleVapid(dependencies, kv, environment);
  }

  if (pathname === alertsSubscribePath) {
    if (request.method !== "POST") {
      return jsonResponse({ error: "method_not_allowed" }, 405, 0);
    }

    if (kv === null) {
      return unavailableResponse();
    }

    return handleSubscribe(request, dependencies, kv);
  }

  if (pathname === alertsUnsubscribePath) {
    if (request.method !== "POST") {
      return jsonResponse({ error: "method_not_allowed" }, 405, 0);
    }

    if (kv === null) {
      return unavailableResponse();
    }

    return handleUnsubscribe(request, kv);
  }

  return jsonResponse({ error: "not_found" }, 404, 0);
}

/**
 * Cron de Cloudflare: actualiza el monitor sin bloquear la respuesta del
 * disparador. Si no hay KV configurado, el sitio sigue funcionando sin avisos.
 */
export function handleAlertSchedule(
  controller: ScheduledControllerLike,
  environment: AlertWorkerEnvironment,
  context: ScheduledContextLike,
  dependencies: AlertScheduleDependencies = {},
): void {
  const kv = environment.ALERTS ?? null;

  if (kv === null) {
    return;
  }

  const runMonitor = dependencies.runMonitor ?? runFloodMonitor;
  const runArguments = {
    kv,
    environment,
    now: () => new Date(controller.scheduledTime),
    ...(dependencies.cache === undefined ? {} : { cache: dependencies.cache }),
  };

  context.waitUntil(
    runMonitor(runArguments).catch(() => {
      // El proximo Cron vuelve a intentar; no se registra la suscripcion.
    }),
  );
}
