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
