// Service worker: cache-first for Pyodide + PyPI packages
const CACHE_NAME = "pyodide-cache-v1";

const CACHEABLE_HOSTS = [
  "cdn.jsdelivr.net/pyodide/",
  "files.pythonhosted.org/",
  "pypi.org/pypi/",
];

function shouldCache(url) {
  return CACHEABLE_HOSTS.some((pattern) => url.includes(pattern));
}

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (!shouldCache(event.request.url)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(event.request).then((response) => {
        if (!response.ok) {
          return response;
        }

        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clone);
        });

        return response;
      });
    })
  );
});
