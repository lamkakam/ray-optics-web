import { readFileSync } from "node:fs";
import { join } from "node:path";

import packageJson from "../package.json";

const generatedHelperPath = "src/shared/lib/utils/generated/pythonExportApertureHelpers.ts";
const generateCommand = "node scripts/generate-python-export-helpers.mjs";

describe("Python export helper codegen config", () => {
  it("runs export helper generation automatically before commands that consume TypeScript", () => {
    expect(packageJson.scripts["generate:python-export-helpers"]).toBe(generateCommand);
    expect(packageJson.scripts.postinstall).toBe("npm run generate:python-export-helpers");
    expect(packageJson.scripts["pretype-check"]).toBe("npm run generate:python-export-helpers");
    expect(packageJson.scripts.prelint).toBe("npm run generate:python-export-helpers");
    expect(packageJson.scripts.pretest).toBe("npm run generate:python-export-helpers");
    expect(packageJson.scripts.prebuild).toBe("npm run generate:python-export-helpers && bash scripts/build-python-wheel.sh");
    expect(packageJson.scripts.predev).toBe("npm run generate:python-export-helpers && bash scripts/build-python-wheel.sh");
    expect(packageJson.scripts["pretest:e2e"]).toBe("npm run generate:python-export-helpers && bash scripts/build-python-wheel.sh");
  });

  it("keeps generated export helper output out of git", () => {
    const gitignore = readFileSync(join(process.cwd(), ".gitignore"), "utf8");

    expect(gitignore.split(/\r?\n/)).toContain(generatedHelperPath);
  });
});
