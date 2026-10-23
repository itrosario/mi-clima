/**
 * Entrada del Worker de Cloudflare.
 *
 * El sitio es estatico: los assets se sirven desde `dist` y el Worker solo
 * atiende las rutas que no existen como archivo, en particular el proxy de
 * Prefectura Naval. El cache del borde se toma del runtime de Cloudflare.
 */

import { handlePrefecturaRequest, type WorkerCache } from "./prefecturaWorker";

interface CloudflareCacheStorage {
  readonly default?: WorkerCache;
}

function edgeCache(): WorkerCache | null {
  const storage = (globalThis as { caches?: CloudflareCacheStorage }).caches;

  return storage?.default ?? null;
}

export default {
  fetch(request: Request): Promise<Response> {
    return handlePrefecturaRequest(request, { cache: edgeCache() });
  },
};
