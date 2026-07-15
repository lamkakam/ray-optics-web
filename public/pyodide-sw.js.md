# `public/pyodide-sw.js`

## Purpose

Service-worker template providing cache-first delivery for Pyodide/PyPI resources and immutable Next.js build assets. The post-build generator replaces the manifest marker in the deployed `out/pyodide-sw.js`; the source template itself remains reusable across builds.

## Cache lifecycle

- `pyodide-cache-v1.3` stores Pyodide runtime files, PyPI metadata, and wheels.
- A non-empty generated Next static manifest identifies a production build. Stable `next-static-assets` stores every production deployment's content-hashed `_next/static` files indefinitely so already-open tabs can continue lazy-loading older chunks.
- Production installation adds the generated deployment manifest to `next-static-assets` before the worker skips waiting.
- The empty source-template manifest identifies development. Development installation does not open or populate `next-static-assets`.
- Activation always deletes obsolete caches whose names begin with `pyodide-cache-` and retains the current Pyodide cache and unrelated caches.
- Production activation retains `next-static-assets`. Development activation deletes a legacy `next-static-assets` cache; when deletion succeeds, it claims clients and reloads each controlled window once by navigating it to its current URL. No windows reload when no stale cache was removed.
- Browser storage eviction remains the only expiry mechanism for retained Next assets.

## Request policy

In production, same-origin requests beneath the service worker scope's `_next/static/` directory use the dedicated Next cache first. A cache miss uses the network and stores only a successful response. HTML, route payloads, and lookalike or cross-origin paths are excluded. In development, the worker does not intercept `_next/static` requests, allowing the browser to load current development bundles directly from Next.js.

Pyodide CDN resources, PyPI resources, and same-origin wheels keep their existing cache-first behavior in the versioned Pyodide cache.
