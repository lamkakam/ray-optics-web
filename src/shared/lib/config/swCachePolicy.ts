/**
# `shared/lib/config/swCachePolicy.ts`

## Purpose

Defines pure, testable URL predicates that mirror service-worker caching policy.

## Exports

- `shouldCache(url, origin?)` recognizes Pyodide CDN assets, PyPI metadata and wheels, and same-origin wheel files.
- `isNextStaticAsset(url, origin, basePath?)` recognizes only same-origin URLs beneath the exact base-path-aware `/_next/static/` directory. It rejects malformed URLs, cross-origin resources, and lookalike paths.

These resource classes use separate caches in the worker. Mutable application resources such as HTML and route `.txt` payloads are intentionally excluded.
*/
const CACHEABLE_PATTERNS = [
  "cdn.jsdelivr.net/pyodide/",
  "files.pythonhosted.org/",
  "pypi.org/pypi/",
];

export function shouldCache(url: string, origin?: string): boolean {
  if (CACHEABLE_PATTERNS.some((pattern) => url.includes(pattern))) {
    return true;
  }
  // Cache same-origin .whl files (e.g., the local rayoptics_web_utils wheel)
  if (origin && url.startsWith(origin) && url.endsWith(".whl")) {
    return true;
  }
  return false;
}

export function isNextStaticAsset(
  url: string,
  origin: string,
  basePath = ""
): boolean {
  try {
    const parsedUrl = new URL(url);
    const normalizedBasePath = basePath.replace(/^\/+|\/+$/g, "");
    const staticPath = normalizedBasePath
      ? `/${normalizedBasePath}/_next/static/`
      : "/_next/static/";

    return parsedUrl.origin === origin && parsedUrl.pathname.startsWith(staticPath);
  } catch {
    return false;
  }
}
