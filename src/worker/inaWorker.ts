/**
 * Proxy de lectura para el servicio de datos del INA.
 *
 * El organismo solo acepta `POST` con formulario, pero la cache HTTP solo
 * trabaja con `GET`. El cliente pide al Worker con una URL normal y el Worker
 * reconstruye el formulario contra la fuente oficial. La respuesta se comparte
 * en el borde para que varios visitantes no repitan la misma consulta.
 */

import { inaBaseUrl, inaProxyUrl } from "@/infrastructure/ina/inaApiClient";
import {
  jsonResponse,
  readCachedResponse,
  storeCachedResponse,
  type WorkerCache,
} from "./edgeCache";

const cacheSecondsByResource = {
  estaciones: 6 * 60 * 60,
  datos: 60 * 60,
  series: 60 * 60,
  percentiles: 24 * 60 * 60,
} as const;

type InaResource = keyof typeof cacheSecondsByResource;

export const inaWorkerPath = inaProxyUrl;

export interface InaWorkerDependencies {
  readonly cache?: WorkerCache | null;
  readonly fetchImplementation?: typeof fetch;
}

function isInaResource(value: string | null): value is InaResource {
  return value !== null && Object.hasOwn(cacheSecondsByResource, value);
}

function cacheKey(url: URL): Request {
  const key = new URL(url);
  key.searchParams.sort();

  return new Request(key.toString(), { method: "GET" });
}

function upstreamBody(url: URL): string {
  const parameters = new URLSearchParams(url.searchParams);
  parameters.set("format", "json");

  return parameters.toString();
}

async function upstreamResponse(
  request: Request,
  fetchImplementation: typeof fetch,
): Promise<Response> {
  return fetchImplementation(inaBaseUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded",
    },
    body: upstreamBody(new URL(request.url)),
  });
}

export async function handleInaRequest(
  request: Request,
  dependencies: InaWorkerDependencies = {},
): Promise<Response> {
  if (request.method !== "GET") {
    return jsonResponse({ error: "method_not_allowed" }, 405, 0);
  }

  const url = new URL(request.url);

  if (url.pathname !== inaWorkerPath) {
    return jsonResponse({ error: "not_found" }, 404, 0);
  }

  const resource = url.searchParams.get("request");

  if (!isInaResource(resource)) {
    return jsonResponse({ error: "invalid_resource" }, 400, 0);
  }

  const key = cacheKey(url);
  const cache = dependencies.cache ?? null;
  const cached = await readCachedResponse(cache, key);

  if (cached !== null) {
    return cached;
  }

  const fetchImplementation = dependencies.fetchImplementation ?? globalThis.fetch;
  let upstream: Response;

  try {
    upstream = await upstreamResponse(request, fetchImplementation);
  } catch {
    return jsonResponse({ error: "upstream_unavailable" }, 502, 0);
  }

  if (!upstream.ok) {
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: {
        "cache-control": "no-store",
        "content-type": upstream.headers.get("content-type") ?? "text/plain; charset=utf-8",
      },
    });
  }

  const response = new Response(await upstream.text(), {
    status: 200,
    headers: {
      "cache-control": `public, max-age=${cacheSecondsByResource[resource]}`,
      "content-type": "application/json; charset=utf-8",
    },
  });

  await storeCachedResponse(cache, key, response);

  return response;
}
