import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  webpack: (config) => {
    // Allow Web Workers using the `new Worker(new URL(..., import.meta.url))` pattern
    config.output.workerPublicPath = `${basePath}/_next/`;
    return config;
  },
};

export default nextConfig;
