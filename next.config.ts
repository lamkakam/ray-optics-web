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

const nextConfig: NextConfig = {
  output: "export",
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
    if (!isServer) {
      config.experiments.outputModule = true;
      config.output.module = true;
    }
    // Module workers cannot use webpack's default importScripts chunk loader.
    config.optimization.splitChunks = false;
    // Pyodide's universal loader guards these imports behind its Node runtime check.
    config.plugins.push(
      new webpack.IgnorePlugin({ resourceRegExp: /^(?:node:|ws$)/ }),
    );
    return config;
  },
};

export default nextConfig;
