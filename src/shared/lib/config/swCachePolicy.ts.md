# `shared/lib/config/swCachePolicy.ts`

## Purpose

Defines pure, testable URL predicates that mirror service-worker caching policy.

## Exports

- `shouldCache(url, origin?)` recognizes Pyodide CDN assets, PyPI metadata and wheels, and same-origin wheel files.
- `isNextStaticAsset(url, origin, basePath?)` recognizes only same-origin URLs beneath the exact base-path-aware `/_next/static/` directory. It rejects malformed URLs, cross-origin resources, and lookalike paths.

These resource classes use separate caches in the worker. Mutable application resources such as HTML and route `.txt` payloads are intentionally excluded.
