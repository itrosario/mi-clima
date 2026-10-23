/**
 * Service worker de Mi Clima by IT Rosario.
 *
 * Guarda el armazon de la aplicacion (paginas, iconos y assets con hash),
 * recibe las notificaciones Web Push y abre la pagina de alertas cuando la
 * persona toca una notificacion. Los datos meteorologicos e hidrologicos nunca
 * se cachean aca: las consultas van al Worker, que comparte una cache de borde
 * de una hora entre visitantes.
 */

const staticCacheName = "mi-clima-static-v2";
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

self.addEventListener("push", (event) => {
  const payload = readPushPayload(event);

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: payload.tag,
      data: { url: payload.url },
      requireInteraction: payload.type === "evacuation",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  const targetUrl = new URL(event.notification.data?.url ?? "/es/alertas/", self.location.origin)
    .href;

  event.notification.close();

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const existingWindow = windows.find((client) => client.url.startsWith(self.location.origin));

      if (existingWindow !== undefined) {
        await existingWindow.focus();

        if ("navigate" in existingWindow) {
          await existingWindow.navigate(targetUrl);
        }

        return;
      }

      await self.clients.openWindow(targetUrl);
    })(),
  );
});

function readPushPayload(event) {
  const fallback = {
    title: "Mi Clima",
    body: "Hay novedades en la alerta de inundacion.",
    url: "/es/alertas/",
    tag: "mi-clima-alerta",
    type: "alert",
  };

  if (event.data === null) {
    return fallback;
  }

  try {
    const payload = event.data.json();

    return {
      title: typeof payload.title === "string" ? payload.title : fallback.title,
      body: typeof payload.body === "string" ? payload.body : fallback.body,
      url: typeof payload.url === "string" ? payload.url : fallback.url,
      tag: typeof payload.tag === "string" ? payload.tag : fallback.tag,
      type: typeof payload.type === "string" ? payload.type : fallback.type,
    };
  } catch {
    return fallback;
  }
}

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
