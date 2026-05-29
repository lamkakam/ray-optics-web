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
  webpack: (config) => {
    // Allow Web Workers using the `new Worker(new URL(..., import.meta.url))` pattern
    config.output.workerPublicPath = `${basePath}/_next/`;
    return config;
  },
};

export default nextConfig;
