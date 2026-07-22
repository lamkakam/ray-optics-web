/**
# next.config.ts
*/
import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

import developmentConfig from "./next.config.dev";

/**
## Responsibilities

- Returns the shared development configuration unchanged for `PHASE_DEVELOPMENT_SERVER`, allowing `next dev` to serve dynamic development output.
- Removes the Next.js `headers` configuration for all other phases because static exports cannot apply it; `public/serve.json` supplies the same cross-origin isolation headers when `npm run serve` hosts the exported files.
- Adds `output: "export"` for those non-development phases, including production builds, so `next build` creates the static `out` directory used by `npm run serve`.
- Keeps all shared settings in `next.config.dev.ts` so development and production do not drift.
*/
/**
Selects the Next.js configuration for the current execution phase.
*/
export default function getNextConfig(phase: string): NextConfig {
  if (phase === PHASE_DEVELOPMENT_SERVER) {
    return developmentConfig;
  }

  const productionConfig = { ...developmentConfig };
  delete productionConfig.headers;

  return {
    ...productionConfig,
    output: "export",
  };
}
