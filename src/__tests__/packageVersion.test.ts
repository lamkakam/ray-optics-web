import { readFileSync } from "node:fs";
import path from "node:path";

describe("package metadata", () => {
  it("bumps the project version to 0.4.4", () => {
    const packageJsonPath = path.resolve(process.cwd(), "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      version: string;
    };

    expect(packageJson.version).toBe("0.4.4");
  });
});
