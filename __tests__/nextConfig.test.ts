import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD } from "next/constants";

import getNextConfig from "../next.config";

const crossOriginIsolationHeaders = [
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
  {
    key: "Cross-Origin-Embedder-Policy",
    value: "require-corp",
  },
];

describe("nextConfig", () => {
  const developmentConfig = getNextConfig(PHASE_DEVELOPMENT_SERVER);
  const productionConfig = getNextConfig(PHASE_PRODUCTION_BUILD);

  it("does not configure static export for the development server", () => {
    expect(developmentConfig).not.toHaveProperty("output");
  });

  it("configures static export for production builds", () => {
    expect(productionConfig).toHaveProperty("output", "export");
  });

  it("only adds static export to the shared development configuration", () => {
    const { output, ...productionConfigWithoutOutput } = productionConfig;

    expect(output).toBe("export");
    expect(productionConfigWithoutOutput).toEqual(developmentConfig);
  });

  it("sets cross-origin isolation headers for every route in dev", async () => {
    await expect(developmentConfig.headers?.()).resolves.toEqual([
      {
        source: "/:path*",
        headers: crossOriginIsolationHeaders,
      },
    ]);
  });
});
