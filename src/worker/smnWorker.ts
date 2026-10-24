/**
 * Proxy de las observaciones oficiales del SMN.
 *
 * El SMN publica archivos ZIP que el navegador no puede leer directamente.
 * El Worker los descarga, los descomprime, los normaliza y comparte una unica
 * respuesta durante unos minutos en el borde. Los errores no se cachean.
 */

import type { OfficialWeatherSnapshot } from "@/domain/weather/official";
import { smnProxyUrl } from "@/infrastructure/smn/smnSource";
import { loadSmnSnapshot } from "@/infrastructure/smn/smnUpstream";
import {
  jsonResponse,
  readCachedResponse,
  storeCachedResponse,
  type WorkerCache,
} from "./edgeCache";

const cacheSeconds = 5 * 60;

export const smnWorkerPath = smnProxyUrl;

export interface SmnWorkerDependencies {
  readonly cache?: WorkerCache | null;
  readonly fetchImplementation?: typeof fetch;
}

function cacheKey(url: URL): Request {
  return new Request(`${url.origin}${smnWorkerPath}`, { method: "GET" });
}

export async function handleSmnRequest(
  request: Request,
  dependencies: SmnWorkerDependencies = {},
): Promise<Response> {
  if (request.method !== "GET") {
    return jsonResponse({ error: "method_not_allowed" }, 405, 0);
  }

  const url = new URL(request.url);

  if (url.pathname !== smnWorkerPath) {
    return jsonResponse({ error: "not_found" }, 404, 0);
  }

  const key = cacheKey(url);
  const cache = dependencies.cache ?? null;
  const cached = await readCachedResponse(cache, key);

  if (cached !== null) {
    return cached;
  }

  let snapshot: OfficialWeatherSnapshot;

  try {
    snapshot = await loadSmnSnapshot(
      dependencies.fetchImplementation === undefined
        ? {}
        : { fetchImplementation: dependencies.fetchImplementation },
    );
  } catch {
    return jsonResponse({ error: "upstream_unavailable" }, 502, 0);
  }

  const response = jsonResponse(snapshot, 200, cacheSeconds);
  await storeCachedResponse(cache, key, response);

  return response;
}
