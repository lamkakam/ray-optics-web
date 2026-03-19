# `lib/swCachePolicy.ts`

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

Called from `app/sw.ts` (the Serwist service worker entry point) inside a fetch handler to decide whether to apply a cache-first strategy. Keeping the logic in `lib/` rather than inline in `sw.ts` makes it unit-testable without a service worker environment.
