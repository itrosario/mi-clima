/**
 * Service worker de Mi Clima by IT Rosario.
 *
 * Solo guarda el armazon de la aplicacion (paginas, iconos y assets con hash).
 * Los datos meteorologicos e hidrologicos nunca se cachean aca: cada apertura
 * consulta las fuentes oficiales, tal como exige el sitio.
 */

const staticCacheName = "mi-clima-static-v1";
const appShellPaths = [
  "/es/",
  "/en/",
  "/favicon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
  "/manifest.es.webmanifest",
  "/manifest.en.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(staticCacheName)
      .then((cache) => cache.addAll(appShellPaths))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== staticCacheName).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.startsWith("/api/") || url.pathname === "/service-worker.js") {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request, url));
    return;
  }

  if (
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/fonts/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/favicon.svg"
  ) {
    event.respondWith(cacheFirst(request));
  }
});

async function networkFirstNavigation(request, url) {
  const cache = await caches.open(staticCacheName);

  try {
    const response = await fetch(request);

    if (response.ok) {
      await cache.put(request, response.clone());
    }

    return response;
  } catch {
    const fallbackPath = url.pathname.startsWith("/en/") ? "/en/" : "/es/";
    const cachedPage = await cache.match(request);

    if (cachedPage !== undefined) {
      return cachedPage;
    }

    return (await cache.match(fallbackPath)) ?? Response.error();
  }
}

async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse !== undefined) {
    return cachedResponse;
  }

  const response = await fetch(request);

  if (response.ok) {
    const cache = await caches.open(staticCacheName);
    await cache.put(request, response.clone());
  }

  return response;
}
