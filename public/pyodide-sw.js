// Service worker: cache-first for Pyodide, PyPI packages, and immutable Next assets.
const PYODIDE_CACHE_NAME = "pyodide-cache-v1.3";
const PYODIDE_CACHE_PREFIX = "pyodide-cache-";
const NEXT_STATIC_CACHE_NAME = "next-static-assets";
const NEXT_STATIC_MANIFEST = /* __NEXT_STATIC_MANIFEST__ */ [];

const CACHEABLE_HOSTS = [
  "cdn.jsdelivr.net/pyodide/",
  "files.pythonhosted.org/",
  "pypi.org/pypi/",
];

function shouldCache(url) {
  if (CACHEABLE_HOSTS.some((pattern) => url.includes(pattern))) {
    return true;
  }
  // Cache same-origin .whl files (e.g., the local rayoptics_web_utils wheel)
  if (url.startsWith(self.location.origin) && url.endsWith(".whl")) {
    return true;
  }
  return false;
}

function isNextStaticAsset(url) {
  const parsedUrl = new URL(url);
  const scopePath = new URL(self.registration.scope).pathname;
  const staticPath = `${scopePath.endsWith("/") ? scopePath : `${scopePath}/`}_next/static/`;
  return parsedUrl.origin === self.location.origin && parsedUrl.pathname.startsWith(staticPath);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(NEXT_STATIC_CACHE_NAME)
      .then((cache) => cache.addAll(NEXT_STATIC_MANIFEST))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter(
            (name) =>
              name.startsWith(PYODIDE_CACHE_PREFIX) && name !== PYODIDE_CACHE_NAME
          )
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (isNextStaticAsset(event.request.url)) {
    event.respondWith(
      caches.open(NEXT_STATIC_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) {
          return cached;
        }

        const response = await fetch(event.request);
        if (response.ok) {
          await cache.put(event.request, response.clone());
        }
        return response;
      })
    );
    return;
  }

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
        caches.open(PYODIDE_CACHE_NAME).then((cache) => cache.put(event.request, clone));

        return response;
      });
    })
  );
});
