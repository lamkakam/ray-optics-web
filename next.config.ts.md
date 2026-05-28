# next.config.ts

Configures the Next.js application for a fully static export.

## Responsibilities

- Reads `NEXT_PUBLIC_BASE_PATH` and applies it as `basePath`, defaulting to an empty string for local development.
- Keeps `output` set to `export` so the app can be built as static files.
- Sets cross-origin isolation response headers for every route served by `next dev`:
  - `Cross-Origin-Opener-Policy: same-origin`
  - `Cross-Origin-Embedder-Policy: require-corp`
- Preserves the worker public path under the configured base path so Web Workers created with `new Worker(new URL(..., import.meta.url))` load from the correct `_next` asset path.
