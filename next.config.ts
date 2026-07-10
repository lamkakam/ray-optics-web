import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

import developmentConfig from "./next.config.dev";

export default function getNextConfig(phase: string): NextConfig {
  if (phase === PHASE_DEVELOPMENT_SERVER) {
    return developmentConfig;
  }

  return {
    ...developmentConfig,
    output: "export",
  };
}
