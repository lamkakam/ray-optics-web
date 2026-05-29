import nextConfig from "../next.config";

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
  it("sets cross-origin isolation headers for every route in dev", async () => {
    await expect(nextConfig.headers?.()).resolves.toEqual([
      {
        source: "/:path*",
        headers: crossOriginIsolationHeaders,
      },
    ]);
  });
});
