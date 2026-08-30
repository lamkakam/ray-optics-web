import { readFileSync } from "node:fs";
import { join } from "node:path";

import packageJson from "../package.json";
import packageLockJson from "../package-lock.json";

describe("version metadata", () => {
  const semverPattern = /^\d+\.\d+\.\d+$/;

  const readProjectFile = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

  const readPyprojectVersion = () => {
    const pyproject = readProjectFile("src/python/pyproject.toml");
    const projectVersionMatch = pyproject.match(/^\[project]\s*[\s\S]*?^version\s*=\s*"([^"]+)"\s*$/m);

    expect(projectVersionMatch).not.toBeNull();

    return projectVersionMatch?.[1];
  };

  it("keeps app package metadata in sync", () => {
    expect(packageJson.version).toMatch(semverPattern);
    expect(packageLockJson.version).toBe(packageJson.version);
    expect(packageLockJson.packages[""].version).toBe(packageJson.version);
  });

  it("keeps the Pyodide wheel filename in sync with Python package metadata", () => {
    const pyprojectVersion = readPyprojectVersion();
    const pyodideWorker = readProjectFile("src/workers/pyodide.worker.ts");

    expect(pyprojectVersion).toMatch(semverPattern);
    expect(pyodideWorker).toContain(`rayoptics_web_utils-${pyprojectVersion}-py3-none-any.whl`);
  });
});
