/**
 * Persistencia de suscripciones y del estado del monitor de crecidas.
 *
 * Cada endpoint se guarda bajo un hash para no dejar la URL completa en las
 * claves de KV. El valor conserva la suscripcion cifrada por el navegador y las
 * estaciones elegidas; nunca incluye la ubicacion exacta de la persona.
 */

import { paranaCorridorStationIds } from "@/domain/catalog/corridor";
import { floodStatuses } from "@/domain/flood/types";
import { isRecord } from "@/infrastructure/parsing/jsonValues";
import type {
  AlertKvNamespace,
  AlertLocale,
  AlertMonitorState,
  AlertStationState,
  AlertSubscription,
  AlertSubscriptionKeys,
} from "./alertTypes";
import { decodeBase64Url, encodeBase64Url } from "./base64";

export const subscriptionKeyPrefix = "alertas:sub:";
export const monitorStateKey = "alertas:monitor";
export const vapidKeysKey = "alertas:vapid";

const subscriptionTtlSeconds = 365 * 24 * 60 * 60;
const maximumEndpointLength = 2048;
const allowedStationIds = new Set(paranaCorridorStationIds);
const allowedPushHostSuffixes = [
  "fcm.googleapis.com",
  "push.services.mozilla.com",
  "updates.push.services.mozilla.com",
  "notify.windows.com",
  "push.apple.com",
] as const;

export function isAllowedPushEndpoint(endpoint: string): boolean {
  if (endpoint.length > maximumEndpointLength) {
    return false;
  }

  try {
    const url = new URL(endpoint);

    if (url.protocol !== "https:") {
      return false;
    }

    return allowedPushHostSuffixes.some(
      (suffix) => url.hostname === suffix || url.hostname.endsWith(`.${suffix}`),
    );
  } catch {
    return false;
  }
}

export async function subscriptionStorageId(endpoint: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint));

  return encodeBase64Url(new Uint8Array(digest));
}

export function subscriptionStorageKey(storageId: string): string {
  return `${subscriptionKeyPrefix}${storageId}`;
}

function parseKeys(value: unknown): AlertSubscriptionKeys | null {
  if (!isRecord(value)) {
    return null;
  }

  const p256dh = value.p256dh;
  const auth = value.auth;

  if (typeof p256dh !== "string" || typeof auth !== "string") {
    return null;
  }

  const publicKey = decodeBase64Url(p256dh);
  const authSecret = decodeBase64Url(auth);

  if (publicKey === null || publicKey.length !== 65 || publicKey[0] !== 4) {
    return null;
  }

  if (authSecret === null || authSecret.length !== 16) {
    return null;
  }

  return { p256dh, auth };
}

function parseStationIds(value: unknown): readonly string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const stationIds = value.filter(
    (stationId): stationId is string =>
      typeof stationId === "string" && allowedStationIds.has(stationId),
  );

  return stationIds.length === 0 ? null : [...new Set(stationIds)];
}

function parseLocale(value: unknown): AlertLocale {
  return value === "en" ? "en" : "es";
}

/**
 * Valida y normaliza el cuerpo que envia el navegador al suscribirse.
 *
 * Devuelve `null` ante cualquier dato que no se pueda usar. En particular,
 * solo acepta endpoints de servicios push conocidos para que el monitor nunca
 * pueda terminar haciendo peticiones a un host arbitrario.
 */
export function parseSubscriptionPayload(payload: unknown, now: Date): AlertSubscription | null {
  if (!isRecord(payload)) {
    return null;
  }

  const endpoint = payload.endpoint;
  const keys = parseKeys(payload.keys);
  const stationIds = parseStationIds(payload.stationIds);

  if (
    typeof endpoint !== "string" ||
    !isAllowedPushEndpoint(endpoint) ||
    keys === null ||
    stationIds === null
  ) {
    return null;
  }

  const expirationTime =
    typeof payload.expirationTime === "number" && Number.isFinite(payload.expirationTime)
      ? payload.expirationTime
      : null;
  const timestamp = now.toISOString();

  return {
    endpoint,
    expirationTime,
    keys,
    stationIds,
    locale: parseLocale(payload.locale),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function parseStoredSubscription(raw: string | null): AlertSubscription | null {
  if (raw === null) {
    return null;
  }

  let payload: unknown;

  try {
    payload = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isRecord(payload)) {
    return null;
  }

  const base = parseSubscriptionPayload(payload, new Date(0));
  const createdAt = payload.createdAt;
  const updatedAt = payload.updatedAt;

  if (base === null || typeof createdAt !== "string" || typeof updatedAt !== "string") {
    return null;
  }

  return { ...base, createdAt, updatedAt };
}

export async function readSubscription(
  kv: AlertKvNamespace,
  endpoint: string,
): Promise<AlertSubscription | null> {
  const storageId = await subscriptionStorageId(endpoint);
  const raw = await kv.get(subscriptionStorageKey(storageId));

  return parseStoredSubscription(raw);
}

export async function saveSubscription(
  kv: AlertKvNamespace,
  subscription: AlertSubscription,
): Promise<void> {
  const storageId = await subscriptionStorageId(subscription.endpoint);

  await kv.put(subscriptionStorageKey(storageId), JSON.stringify(subscription), {
    expirationTtl: subscriptionTtlSeconds,
  });
}

export async function deleteSubscription(kv: AlertKvNamespace, endpoint: string): Promise<void> {
  const storageId = await subscriptionStorageId(endpoint);

  await kv.delete(subscriptionStorageKey(storageId));
}

export async function listSubscriptions(
  kv: AlertKvNamespace,
): Promise<readonly AlertSubscription[]> {
  const subscriptions: AlertSubscription[] = [];
  let cursor: string | undefined;

  while (true) {
    const page = await kv.list({
      prefix: subscriptionKeyPrefix,
      ...(cursor === undefined ? {} : { cursor }),
    });

    for (const key of page.keys) {
      const subscription = parseStoredSubscription(await kv.get(key.name));

      if (subscription !== null) {
        subscriptions.push(subscription);
      }
    }

    if (
      page.listComplete === true ||
      page.list_complete === true ||
      page.cursor === undefined
    ) {
      return subscriptions;
    }

    cursor = page.cursor;
  }
}

function parseStationState(value: unknown): AlertStationState | null {
  if (!isRecord(value)) {
    return null;
  }

  const status = value.status;
  const level = value.level;
  const observedAt = value.observedAt;
  const lastRapidRiseNotifiedAt = value.lastRapidRiseNotifiedAt;

  if (
    typeof status !== "string" ||
    !floodStatuses.includes(status as AlertStationState["status"]) ||
    (level !== null && typeof level !== "number") ||
    (observedAt !== null && typeof observedAt !== "string") ||
    (lastRapidRiseNotifiedAt !== null && typeof lastRapidRiseNotifiedAt !== "string")
  ) {
    return null;
  }

  return {
    status: status as AlertStationState["status"],
    level,
    observedAt,
    lastRapidRiseNotifiedAt,
  };
}

function parseMonitorState(raw: string | null): AlertMonitorState | null {
  if (raw === null) {
    return null;
  }

  let payload: unknown;

  try {
    payload = JSON.parse(raw);
  } catch {
    return null;
  }

  if (
    !isRecord(payload) ||
    payload.version !== 1 ||
    typeof payload.initializedAt !== "string" ||
    typeof payload.updatedAt !== "string" ||
    !isRecord(payload.stations)
  ) {
    return null;
  }

  const stations: Record<string, AlertStationState> = {};

  for (const [stationId, value] of Object.entries(payload.stations)) {
    const state = parseStationState(value);

    if (state === null) {
      return null;
    }

    stations[stationId] = state;
  }

  return {
    version: 1,
    initializedAt: payload.initializedAt,
    updatedAt: payload.updatedAt,
    stations,
  };
}

export async function readMonitorState(kv: AlertKvNamespace): Promise<AlertMonitorState | null> {
  return parseMonitorState(await kv.get(monitorStateKey));
}

export async function writeMonitorState(
  kv: AlertKvNamespace,
  state: AlertMonitorState,
): Promise<void> {
  await kv.put(monitorStateKey, JSON.stringify(state));
}

export async function readVapidKeys(kv: AlertKvNamespace): Promise<string | null> {
  return kv.get(vapidKeysKey);
}

export async function writeVapidKeys(kv: AlertKvNamespace, serializedKeys: string): Promise<void> {
  await kv.put(vapidKeysKey, serializedKeys);
}
