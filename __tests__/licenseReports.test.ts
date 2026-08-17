/**
 * Regression coverage for excluding the first-party root package from npm
 * third-party license reports generated for source control and deployment.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import packageJson from "../package.json";

describe("npm third-party license reports", () => {
  const rootPackageExclusion = `--excludePackages=${packageJson.name}`;
  const npmLicenseScriptNames = [
    "generate:third-party-licenses",
    "postbuild",
  ] as const;

  it.each(npmLicenseScriptNames)(
    "excludes the root package in the %s script",
    (scriptName) => {
      expect(packageJson.scripts[scriptName]).toContain(rootPackageExclusion);
    },
  );

  it("omits the root package from the tracked report", () => {
    const trackedReport = readFileSync(
      join(process.cwd(), "THIRD-PARTY-LICENSES.md"),
      "utf8",
    );

    expect(trackedReport).not.toContain(`[${packageJson.name}@`);
  });
});
