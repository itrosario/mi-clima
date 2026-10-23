/**
 * Proxy de solo lectura para las alturas de Prefectura Naval Argentina.
 *
 * El servidor de Prefectura no envia cabeceras CORS, de modo que el navegador
 * no puede leer su HTML. Este Worker consulta la fuente oficial, la normaliza
 * a JSON y la publica en el mismo origen del sitio. No guarda estado: cada
 * respuesta se puede cachear en el borde durante un minuto.
 */

import type { PrefecturaReading } from "@/domain/prefectura/types";
import {
  parsePrefecturaHistory,
  parsePrefecturaReadings,
} from "@/infrastructure/prefectura/prefecturaHtmlParser";
import {
  jsonResponse,
  readCachedResponse,
  storeCachedResponse,
  type WorkerCache,
} from "./edgeCache";

export type { WorkerCache } from "./edgeCache";

export const prefecturaSnapshotPath = "/api/prefectura";
export const prefecturaHistoryPath = "/api/prefectura/historico";

const prefecturaSourceUrl = "https://contenidosweb.prefecturanaval.gob.ar/alturas/";
const snapshotCacheSeconds = 60 * 60;
const historyCacheSeconds = 60 * 60;

export interface PrefecturaWorkerDependencies {
  /** Cache del borde; las pruebas inyectan un doble en memoria. */
  readonly cache?: WorkerCache | null;
  readonly fetchImplementation?: typeof fetch;
  readonly now?: () => Date;
}

function serializeReading(reading: PrefecturaReading): Record<string, unknown> {
  return {
    ...reading,
    observedAt: reading.observedAt?.toISOString() ?? null,
    previousObservedAt: reading.previousObservedAt?.toISOString() ?? null,
  };
}

async function loadSourceHtml(
  url: string,
  fetchImplementation: typeof fetch,
): Promise<string | null> {
  try {
    const response = await fetchImplementation(url, {
      headers: { accept: "text/html" },
    });

    return response.ok ? await response.text() : null;
  } catch {
    return null;
  }
}

function currentTimestamp(dependencies: PrefecturaWorkerDependencies): string {
  return (dependencies.now ?? (() => new Date()))().toISOString();
}

function unexpectedPayload(): Response {
  return jsonResponse({ error: "unexpected_source_payload" }, 502, 0);
}

async function buildSnapshot(
  dependencies: PrefecturaWorkerDependencies,
  fetchImplementation: typeof fetch,
): Promise<Response> {
  const html = await loadSourceHtml(prefecturaSourceUrl, fetchImplementation);
  if (html === null) {
    return jsonResponse({ error: "upstream_unavailable" }, 502, 0);
  }

  const readings = parsePrefecturaReadings(html);
  if (readings.length === 0) {
    return unexpectedPayload();
  }

  return jsonResponse(
    {
      fetchedAt: currentTimestamp(dependencies),
      sourceName: "Prefectura Naval Argentina",
      sourceUrl: prefecturaSourceUrl,
      readings: readings.map(serializeReading),
    },
    200,
    snapshotCacheSeconds,
  );
}

async function buildHistory(
  portId: number,
  dependencies: PrefecturaWorkerDependencies,
  fetchImplementation: typeof fetch,
): Promise<Response> {
  const html = await loadSourceHtml(
    `${prefecturaSourceUrl}?page=historico&tiempo=7&id=${portId}`,
    fetchImplementation,
  );
  if (html === null) {
    return jsonResponse({ error: "upstream_unavailable" }, 502, 0);
  }

  const points = parsePrefecturaHistory(html);
  if (points.length === 0) {
    return unexpectedPayload();
  }

  return jsonResponse(
    {
      fetchedAt: currentTimestamp(dependencies),
      portId,
      sourceName: "Prefectura Naval Argentina",
      points: points.map((point) => ({
        timestamp: point.timestamp.toISOString(),
        value: point.value,
      })),
    },
    200,
    historyCacheSeconds,
  );
}

function readPortId(url: URL): number | null {
  const raw = Number(url.searchParams.get("id"));

  return Number.isInteger(raw) && raw > 0 ? raw : null;
}

export async function handlePrefecturaRequest(
  request: Request,
  dependencies: PrefecturaWorkerDependencies = {},
): Promise<Response> {
  if (request.method !== "GET") {
    return jsonResponse({ error: "method_not_allowed" }, 405, 0);
  }

  const url = new URL(request.url);
  const cache = dependencies.cache ?? null;
  const cacheKey = new Request(url.toString(), { method: "GET" });
  const cached = await readCachedResponse(cache, cacheKey);

  if (cached !== null) {
    return cached;
  }

  const fetchImplementation = dependencies.fetchImplementation ?? globalThis.fetch;
  let response: Response;

  if (url.pathname === prefecturaSnapshotPath) {
    response = await buildSnapshot(dependencies, fetchImplementation);
  } else if (url.pathname === prefecturaHistoryPath) {
    const portId = readPortId(url);
    response =
      portId === null
        ? jsonResponse({ error: "invalid_port_id" }, 400, 0)
        : await buildHistory(portId, dependencies, fetchImplementation);
  } else {
    response = jsonResponse({ error: "not_found" }, 404, 0);
  }

  await storeCachedResponse(cache, cacheKey, response);

  return response;
}
