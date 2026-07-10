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

  it("ignores only Pyodide's expression-dependency warning", () => {
    const existingWarningFilter = /existing warning/;
    const config = {
      output: {},
      experiments: {},
      optimization: {},
      plugins: [],
      ignoreWarnings: [existingWarningFilter],
    };
    const webpack = {
      IgnorePlugin: class IgnorePlugin {
        constructor(public options: unknown) {}
      },
    };

    const configured = nextConfig.webpack?.(config as never, {
      isServer: false,
      webpack,
    } as never);

    expect(configured?.ignoreWarnings).toHaveLength(2);
    expect(configured?.ignoreWarnings?.[0]).toBe(existingWarningFilter);

    const pyodideWarningFilter = configured?.ignoreWarnings?.[1];
    expect(pyodideWarningFilter).toEqual({
      module: expect.any(RegExp),
      message: expect.any(RegExp),
    });

    if (
      !pyodideWarningFilter ||
      typeof pyodideWarningFilter !== "object" ||
      !("module" in pyodideWarningFilter) ||
      !("message" in pyodideWarningFilter) ||
      !(pyodideWarningFilter.module instanceof RegExp) ||
      !(pyodideWarningFilter.message instanceof RegExp)
    ) {
      throw new Error("Expected a module-and-message warning filter");
    }

    const { module, message } = pyodideWarningFilter;
    const criticalDependencyWarning =
      "Critical dependency: the request of a dependency is an expression";

    expect(module.test("/repo/node_modules/pyodide/pyodide.mjs")).toBe(true);
    expect(module.test("C:\\repo\\node_modules\\pyodide\\pyodide.mjs")).toBe(
      true,
    );
    expect(message.test(criticalDependencyWarning)).toBe(true);

    expect(module.test("/repo/node_modules/another-package/pyodide.mjs")).toBe(
      false,
    );
    expect(message.test(`${criticalDependencyWarning} (extra context)`)).toBe(
      false,
    );
    expect(message.test("A different warning from Pyodide")).toBe(false);
  });
});
