# serve.json

Configures the local static server used by `npm run serve`, which runs `npx serve out`.

## Responsibilities

- Lives under `public` so `next build` copies it into `out/serve.json`, where `serve` reads configuration for the exported static directory.
- Applies cross-origin isolation response headers to every static file served from `out`:
  - `Cross-Origin-Opener-Policy: same-origin`
  - `Cross-Origin-Embedder-Policy: require-corp`
- Keeps the deployment configuration unchanged; this file only affects local static serving through `serve`.
