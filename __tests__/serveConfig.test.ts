import serveConfig from "../public/serve.json";

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

describe("serve config", () => {
  it("sets cross-origin isolation headers for every static file", () => {
    expect(serveConfig.headers).toEqual([
      {
        source: "**",
        headers: crossOriginIsolationHeaders,
      },
    ]);
  });
});
