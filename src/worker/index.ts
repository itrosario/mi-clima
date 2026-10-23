/**
 * Entrada del Worker de Cloudflare.
 *
 * El sitio es estatico: los assets se sirven desde `dist` y el Worker atiende
 * los proxies de datos de INA, Open-Meteo y Prefectura Naval. Las respuestas
 * exitosas se comparten en la cache del borde del runtime de Cloudflare.
 */

import { handleInaRequest, inaWorkerPath } from "./inaWorker";
import { handlePrefecturaRequest, type WorkerCache } from "./prefecturaWorker";
import { handleWeatherRequest, weatherWorkerPath } from "./weatherWorker";

interface CloudflareCacheStorage {
  readonly default?: WorkerCache;
}

function edgeCache(): WorkerCache | null {
  const storage = (globalThis as { caches?: CloudflareCacheStorage }).caches;

  return storage?.default ?? null;
}

export default {
  fetch(request: Request): Promise<Response> {
    const dependencies = { cache: edgeCache() };
    const { pathname } = new URL(request.url);

    if (pathname === inaWorkerPath) {
      return handleInaRequest(request, dependencies);
    }

    if (pathname === weatherWorkerPath) {
      return handleWeatherRequest(request, dependencies);
    }

    return handlePrefecturaRequest(request, dependencies);
  },
};
