import type { Config } from "jest";

const config: Config = {
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.test.json",
      },
    ],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^comlink$": "<rootDir>/__mocks__/comlink.ts",
    "^pyodide$": "<rootDir>/__mocks__/pyodide.ts",
    "^ag-grid-react$": "<rootDir>/__mocks__/ag-grid-react.tsx",
    "^ag-grid-community$": "<rootDir>/__mocks__/ag-grid-community.ts",
    "^ag-grid-community/styles/.*$": "<rootDir>/__mocks__/ag-grid-community.ts",
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/.next/", "<rootDir>/e2e/"],
};

export default config;
