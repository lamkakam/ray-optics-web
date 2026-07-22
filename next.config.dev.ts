/**
Defines the shared Next.js settings used by both development and production without enabling static export.

## Responsibilities

- Reads `NEXT_PUBLIC_BASE_PATH` and applies it as `basePath`, defaulting to an empty string for local development.
- Sets cross-origin isolation response headers for every route served by `next dev`:
  - `Cross-Origin-Opener-Policy: same-origin`
  - `Cross-Origin-Embedder-Policy: require-corp`
- Preserves the worker public path under the configured base path so Web Workers created with `new Worker(new URL(..., import.meta.url))` load from the correct `_next` asset path.
- Disables webpack chunk splitting so the Pyodide worker remains self-contained. Webpack's default web-worker chunk loader uses `importScripts`, which is unavailable in module workers.
- Enables webpack's module-output experiment for every compilation so App Router browser modules shared through Next.js's development cache preserve `{ type: "module" }` instead of rewriting it to a classic worker.
- Explicitly enables module output only for client builds and disables it for server builds, keeping Next's development server and page-data collection CommonJS-compatible.
- Assigns the client webpack library to `globalThis._N_E`. This preserves Next.js's client export namespace while avoiding the unqualified `_N_E` assignment that is invalid in strict ES-module workers.
- Ignores `node:` and `ws` imports in browser bundles. Pyodide 314's universal npm loader contains these imports behind a Node-runtime guard, but webpack otherwise resolves them (and emits an async `ws` chunk) while building the module worker.
- Suppresses only the expression-dependency warning emitted from `node_modules/pyodide/pyodide.mjs`. Pyodide 314's published bundle omitted the upstream `webpackIgnore` comment and regressed a warning fixed in v0.21.3; the module-and-message filter preserves other webpack warnings and any filters supplied by Next.js.
*/
import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
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

const developmentConfig: NextConfig = {
  basePath,
  headers: async () => [
    {
      source: "/:path*",
      headers: crossOriginIsolationHeaders,
    },
  ],
  webpack: (config, { isServer, webpack }) => {
    // Allow Web Workers using the `new Worker(new URL(..., import.meta.url))` pattern
    config.output.workerPublicPath = `${basePath}/_next/`;
    config.experiments.outputModule = true;
    if (!isServer) {
      config.output.module = true;
      config.output.library = {
        type: "assign",
        name: ["globalThis", "_N_E"],
      };
    } else {
      config.output.module = false;
    }
    // Module workers cannot use webpack's default importScripts chunk loader.
    config.optimization.splitChunks = false;
    // Pyodide's universal loader guards these imports behind its Node runtime check.
    config.plugins.push(
      new webpack.IgnorePlugin({ resourceRegExp: /^(?:node:|ws$)/ }),
    );
    // Pyodide 314's published bundle omitted its upstream webpackIgnore comment.
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      {
        module: /[\\/]node_modules[\\/]pyodide[\\/]pyodide\.mjs$/,
        message:
          /^Critical dependency: the request of a dependency is an expression$/,
      },
    ];
    return config;
  },
};

export default developmentConfig;
