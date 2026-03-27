/**
 * Verso Air — Service Worker
 * Caches app shell for offline-capable PWA + keeps audio alive in background
 */

const CACHE_NAME = "versoair-v1";
const APP_SHELL = ["/", "/index.html"];

// Install: pre-cache app shell
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

// Fetch: network-first with cache fallback for navigation
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Skip non-GET and API/stream requests — never cache those
  if (
    request.method !== "GET" ||
    request.url.includes("/api/") ||
    request.url.includes("/stream")
  ) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses for app shell files
        if (response.ok && response.type === "basic") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request)),
  );
});
