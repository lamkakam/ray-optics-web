# next.config.ts

Selects the Next.js configuration for the current execution phase.

## Responsibilities

- Returns the shared development configuration unchanged for `PHASE_DEVELOPMENT_SERVER`, allowing `next dev` to serve dynamic development output.
- Removes the Next.js `headers` configuration for all other phases because static exports cannot apply it; `public/serve.json` supplies the same cross-origin isolation headers when `npm run serve` hosts the exported files.
- Adds `output: "export"` for those non-development phases, including production builds, so `next build` creates the static `out` directory used by `npm run serve`.
- Keeps all shared settings in `next.config.dev.ts` so development and production do not drift.
