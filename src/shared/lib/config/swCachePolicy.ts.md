# `shared/lib/config/swCachePolicy.ts`

## Purpose

Provides a pure function that determines whether a given URL should be cached by the service worker, encapsulating cache-inclusion rules in one testable place.

## Exports

```ts
export function shouldCache(url: string, origin?: string): boolean;
```

## Behavior

Returns `true` when the URL matches any of the following conditions:

1. **CDN patterns** — the URL contains any of these substrings:
   - `"cdn.jsdelivr.net/pyodide/"` — Pyodide WASM bundle and standard library
   - `"files.pythonhosted.org/"` — Python package files (wheels/tarballs)
   - `"pypi.org/pypi/"` — PyPI metadata API

2. **Same-origin `.whl` files** — `origin` is provided, the URL starts with `origin`, and the URL ends with `".whl"`. This covers the local `rayoptics_web_utils` wheel served from the app's own origin.

Returns `false` for all other URLs.

## Dependencies

None.

## Edge Cases / Error Handling

- `origin` is optional; when absent, same-origin `.whl` caching is skipped.
- Substring matching (not URL parsing) is used for CDN patterns — the patterns are specific enough that false positives are unlikely, but callers should be aware.
- The function is pure (no side effects) and safe to call from any context including the service worker.

## Usages

```ts
import { shouldCache } from "@/shared/lib/config/swCachePolicy";
import { cacheFirst, networkFirst } from "serwist";

// In the service worker (app/sw.ts)
export default defaultHandler;

self.addEventListener("fetch", (event: FetchEvent) => {
  const { request } = event;
  const shouldCacheUrl = shouldCache(
    request.url,
    self.location.origin // Pass the current origin
  );

  if (shouldCacheUrl) {
    // Cache-first strategy for Pyodide/wheels
    event.respondWith(cacheFirst().handle(request));
  } else {
    // Network-first for everything else
    event.respondWith(networkFirst().handle(request));
  }
});

// In unit tests
test("caches Pyodide bundle from CDN", () => {
  const url = "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js";
  expect(shouldCache(url)).toBe(true);
});

test("caches local wheels from same origin", () => {
  const origin = "https://example.com";
  const wheelUrl = "https://example.com/wheels/rayoptics_web_utils.whl";
  expect(shouldCache(wheelUrl, origin)).toBe(true);
});
```

Called from `app/sw.ts` (Serwist entry point) in a fetch handler to decide cache strategy. Kept in `lib/` for unit testability.
