# dev-server.js

Runs the Next.js application in webpack development mode while applying the response headers required for cross-origin isolation.

## Responsibilities

- Uses port `3000` by default and respects the `PORT` environment variable.
- Starts Next.js with `dev: true` and `webpack: true`, preserving webpack compilation, file watching, and Fast Refresh.
- Supplies the Node HTTP server to Next.js so Next can attach its development WebSocket upgrade handler.
- Applies these headers to every normal HTTP response before delegating to Next:
  - `Cross-Origin-Opener-Policy: same-origin`
  - `Cross-Origin-Embedder-Policy: require-corp`
- Exports `withCrossOriginIsolationHeaders` so header behavior and delegation can be tested without starting Next.js.
