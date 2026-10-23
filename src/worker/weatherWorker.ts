/**
 * Proxy de Open-Meteo.
 *
 * Mantiene la fuente no oficial fuera del HTML y comparte una unica respuesta
 * por hora en el borde. El Worker no inventa ni completa datos: solo reenvia
 * los parametros permitidos y devuelve el JSON tal como lo publica la API.
 */

import {
  openMeteoForecastUrl,
  openMeteoProxyUrl,
} from "@/infrastructure/openMeteo/openMeteoSource";
import {
  jsonResponse,
  readCachedResponse,
  storeCachedResponse,
  type WorkerCache,
} from "./edgeCache";

const cacheSeconds = 60 * 60;

const allowedParameters = [
  "latitude",
  "longitude",
  "current",
  "daily",
  "timezone",
  "forecast_days",
  "wind_speed_unit",
] as const;

export const weatherWorkerPath = openMeteoProxyUrl;

export interface WeatherWorkerDependencies {
  readonly cache?: WorkerCache | null;
  readonly fetchImplementation?: typeof fetch;
}

function cacheKey(url: URL): Request {
  const key = new URL(url);
  key.searchParams.sort();

  return new Request(key.toString(), { method: "GET" });
}

function upstreamUrl(url: URL): string {
  const upstream = new URL(openMeteoForecastUrl);

  for (const parameter of allowedParameters) {
    const value = url.searchParams.get(parameter);

    if (value !== null) {
      upstream.searchParams.set(parameter, value);
    }
  }

  return upstream.toString();
}

export async function handleWeatherRequest(
  request: Request,
  dependencies: WeatherWorkerDependencies = {},
): Promise<Response> {
  if (request.method !== "GET") {
    return jsonResponse({ error: "method_not_allowed" }, 405, 0);
  }

  const url = new URL(request.url);

  if (url.pathname !== weatherWorkerPath) {
    return jsonResponse({ error: "not_found" }, 404, 0);
  }

  if (url.searchParams.get("latitude") === null || url.searchParams.get("longitude") === null) {
    return jsonResponse({ error: "missing_coordinates" }, 400, 0);
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
    upstream = await fetchImplementation(upstreamUrl(url), {
      method: "GET",
      headers: { accept: "application/json" },
    });
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
      "cache-control": `public, max-age=${cacheSeconds}`,
      "content-type": "application/json; charset=utf-8",
    },
  });

  await storeCachedResponse(cache, key, response);

  return response;
}
