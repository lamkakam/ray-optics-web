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
    "^@/(.*)$": "<rootDir>/src/$1",
    "^comlink$": "<rootDir>/src/__mocks__/comlink.ts",
    "^pyodide$": "<rootDir>/src/__mocks__/pyodide.ts",
    "^ag-grid-react$": "<rootDir>/src/__mocks__/ag-grid-react.tsx",
    "^ag-grid-community$": "<rootDir>/src/__mocks__/ag-grid-community.ts",
    "^ag-grid-community/styles/.*$": "<rootDir>/src/__mocks__/ag-grid-community.ts",
    "^@visx/responsive$": "<rootDir>/src/__mocks__/@visx/responsive.tsx",
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/.next/", "<rootDir>/src/e2e/"],
};

export default config;
