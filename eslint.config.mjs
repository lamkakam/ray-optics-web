import nextConfig from "eslint-config-next";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...nextConfig,
  {
    ignores: ["node_modules/", ".next/", "coverage/", "src/python/", "scripts/"],
  },
];

export default config;
