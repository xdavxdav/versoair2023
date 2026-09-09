/**
 * Verso Air — Service Worker
 * Caches app shell for offline-capable PWA + keeps audio alive in background
 */

const CACHE_NAME = "versoair-v3";
const APP_SHELL = ["/", "/index.html"];

// Install: pre-cache a fallback shell, but always prefer the deployed version.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

// Fetch: network-first with cache fallback for navigation.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and API/stream requests — never cache those
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") ||
    url.pathname.includes("/stream") ||
    url.pathname.startsWith("/src/") ||
    url.pathname.startsWith("/@")
  ) {
    return;
  }

  const isNavigation = request.mode === "navigate";
  const isStaticAsset = ["script", "style", "image", "font"].includes(
    request.destination,
  );
  if (!isNavigation && !isStaticAsset) return;

  event.respondWith(
    (isNavigation
      ? fetch(new Request(request, { cache: "no-store" })).then((response) => {
          if (response.ok && response.type === "basic") {
            const clone = response.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put("/index.html", clone));
          }
          return response;
        })
      : caches.match(request).then(
          (cached) =>
            cached ||
            fetch(request).then((response) => {
              if (response.ok && response.type === "basic") {
                const clone = response.clone();
                caches
                  .open(CACHE_NAME)
                  .then((cache) => cache.put(request, clone));
              }
              return response;
            }),
        )
    ).catch(() => caches.match(isNavigation ? "/index.html" : request)),
  );
});
