// Service worker: cache-first for Pyodide + PyPI packages
const CACHE_NAME = "pyodide-cache-v1";

const LOCAL_PATH_PREFIXES = ["/pyodide/", "/wheels/"];
const EXTERNAL_HOSTNAMES = ["cdn.jsdelivr.net", "files.pythonhosted.org", "pypi.org"];

function shouldCache(url) {
  if (LOCAL_PATH_PREFIXES.some((p) => url.startsWith(p))) return true;
  try {
    const { hostname, pathname } = new URL(url);
    if (EXTERNAL_HOSTNAMES.includes(hostname)) return false;
    return LOCAL_PATH_PREFIXES.some((p) => pathname.startsWith(p));
  } catch {
    return false;
  }
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
