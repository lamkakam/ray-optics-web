# `scripts/generate-next-static-sw.js`

## Purpose

Generates the deployment-specific service worker manifest after Next.js exports the site.

## Behavior

- Recursively enumerates every file in `out/_next/static`.
- Converts platform paths to URL-encoded public paths and prefixes `NEXT_PUBLIC_BASE_PATH` when configured.
- Sorts URLs for deterministic output.
- Replaces the manifest marker in `out/pyodide-sw.js`; `public/pyodide-sw.js` remains an unmodified template.
- Fails when the static directory is missing or empty, or when the copied worker lacks the expected marker.

The module exports its manifest builder and generator for unit testing. When invoked directly, it operates on the repository's `out` directory.
