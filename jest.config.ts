import type { Config } from "jest";

const config: Config = {
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
      },
    ],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^comlink$": "<rootDir>/__mocks__/comlink.ts",
    "^pyodide$": "<rootDir>/__mocks__/pyodide.ts",
  },
  setupFilesAfterEnv: ["@testing-library/jest-dom"],
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/.next/"],
};

export default config;
