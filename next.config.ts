import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    // Allow Web Workers using the `new Worker(new URL(..., import.meta.url))` pattern
    config.output.workerPublicPath = "/_next/";
    return config;
  },
};

export default nextConfig;
