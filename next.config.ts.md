# next.config.ts

Configures the Next.js application for a fully static export.

## Responsibilities

- Reads `NEXT_PUBLIC_BASE_PATH` and applies it as `basePath`, defaulting to an empty string for local development.
- Keeps `output` set to `export` so the app can be built as static files.
- Sets cross-origin isolation response headers for every route served by `next dev`:
  - `Cross-Origin-Opener-Policy: same-origin`
  - `Cross-Origin-Embedder-Policy: require-corp`
- Preserves the worker public path under the configured base path so Web Workers created with `new Worker(new URL(..., import.meta.url))` load from the correct `_next` asset path.
- Disables webpack chunk splitting so the Pyodide worker remains self-contained. Webpack's default web-worker chunk loader uses `importScripts`, which is unavailable in module workers.
- Enables webpack module output for client builds so the emitted worker preserves `{ type: "module" }` instead of rewriting it to a classic worker. Server output remains CommonJS-compatible for Next's page-data collection.
- Assigns the client webpack library to `globalThis._N_E`. This preserves Next.js's client export namespace while avoiding the unqualified `_N_E` assignment that is invalid in strict ES-module workers.
- Ignores `node:` and `ws` imports in browser bundles. Pyodide 314's universal npm loader contains these imports behind a Node-runtime guard, but webpack otherwise resolves them (and emits an async `ws` chunk) while building the module worker.
