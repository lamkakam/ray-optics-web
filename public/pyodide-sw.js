// Service worker: cache-first for Pyodide, PyPI packages, and immutable Next assets.
const PYODIDE_CACHE_NAME = "pyodide-cache-v1.3";
const PYODIDE_CACHE_PREFIX = "pyodide-cache-";
const NEXT_STATIC_CACHE_NAME = "next-static-assets";
const NEXT_STATIC_MANIFEST = /* __NEXT_STATIC_MANIFEST__ */ [];
const IS_DEVELOPMENT = NEXT_STATIC_MANIFEST.length === 0;

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
  if (IS_DEVELOPMENT) {
    event.waitUntil(self.skipWaiting());
    return;
  }

  event.waitUntil(
    caches
      .open(NEXT_STATIC_CACHE_NAME)
      .then((cache) => cache.addAll(NEXT_STATIC_MANIFEST))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(async (names) => {
      const cacheNamesToDelete = names.filter(
        (name) =>
          (name.startsWith(PYODIDE_CACHE_PREFIX) && name !== PYODIDE_CACHE_NAME) ||
          (IS_DEVELOPMENT && name === NEXT_STATIC_CACHE_NAME)
      );
      const deletionResults = await Promise.all(
        cacheNamesToDelete.map(async (name) => ({
          name,
          deleted: await caches.delete(name),
        }))
      );
      const removedStaleNextAssets = deletionResults.some(
        ({ name, deleted }) => name === NEXT_STATIC_CACHE_NAME && deleted
      );

      await self.clients.claim();
      if (removedStaleNextAssets) {
        const windowClients = await self.clients.matchAll({ type: "window" });
        await Promise.all(
          windowClients.map((client) => client.navigate(client.url))
        );
      }
    })
  );
});

self.addEventListener("fetch", (event) => {
  if (!IS_DEVELOPMENT && isNextStaticAsset(event.request.url)) {
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
