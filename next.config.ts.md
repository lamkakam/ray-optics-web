# next.config.ts

Selects the Next.js configuration for the current execution phase.

## Responsibilities

- Returns the shared development configuration unchanged for `PHASE_DEVELOPMENT_SERVER`, allowing `next dev` to serve dynamic development output.
- Adds `output: "export"` for all other phases, including production builds, so `next build` creates the static `out` directory used by `npm run serve`.
- Keeps all shared settings in `next.config.dev.ts` so development and production do not drift.
