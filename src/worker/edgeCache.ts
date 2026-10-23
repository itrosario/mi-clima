/**
 * Utilidades compartidas por los proxies del Worker.
 *
 * La cache del borde se consulta antes de salir a la fuente oficial. Solo se
 * guardan respuestas exitosas y las respuestas de error se marcan `no-store`.
 */

export interface WorkerCache {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
}

export function jsonResponse(body: unknown, status: number, cacheSeconds: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": cacheSeconds === 0 ? "no-store" : `public, max-age=${cacheSeconds}`,
    },
  });
}

export async function readCachedResponse(
  cache: WorkerCache | null,
  request: Request,
): Promise<Response | null> {
  if (cache === null) {
    return null;
  }

  return (await cache.match(request)) ?? null;
}

export async function storeCachedResponse(
  cache: WorkerCache | null,
  request: Request,
  response: Response,
): Promise<void> {
  if (cache !== null && response.ok) {
    await cache.put(request, response.clone());
  }
}
