import { readFileSync } from "node:fs";
import { join } from "node:path";

import packageJson from "../package.json";
import packageLockJson from "../package-lock.json";

describe("version metadata", () => {
  it("keeps app package metadata at the bumped patch version", () => {
    expect(packageJson.version).toBe("0.16.1");
    expect(packageLockJson.version).toBe("0.16.1");
    expect(packageLockJson.packages[""].version).toBe("0.16.1");
  });

  it("keeps the internal Python package metadata at the bumped minor version", () => {
    const pyproject = readFileSync(join(process.cwd(), "src/python/pyproject.toml"), "utf8");

    expect(pyproject).toContain('version = "0.8.0"');
  });
});
