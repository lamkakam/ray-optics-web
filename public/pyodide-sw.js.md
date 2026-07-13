# `public/pyodide-sw.js`

## Purpose

Service-worker template providing cache-first delivery for Pyodide/PyPI resources and immutable Next.js build assets. The post-build generator replaces the manifest marker in the deployed `out/pyodide-sw.js`; the source template itself remains reusable across builds.

## Cache lifecycle

- `pyodide-cache-v1.3` stores Pyodide runtime files, PyPI metadata, and wheels.
- Stable `next-static-assets` stores every deployment's content-hashed `_next/static` files indefinitely so already-open tabs can continue lazy-loading older chunks.
- Installation adds the generated deployment manifest to `next-static-assets` before the worker skips waiting.
- Activation deletes obsolete caches whose names begin with `pyodide-cache-`, but retains the current Pyodide cache, the Next asset cache, and unrelated caches.
- Browser storage eviction remains the only expiry mechanism for retained Next assets.

## Request policy

Same-origin requests beneath the service worker scope's `_next/static/` directory use the dedicated Next cache first. A cache miss uses the network and stores only a successful response. HTML, route payloads, and lookalike or cross-origin paths are excluded.

Pyodide CDN resources, PyPI resources, and same-origin wheels keep their existing cache-first behavior in the versioned Pyodide cache.
