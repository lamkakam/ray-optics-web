import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildConstructionalParameterManifest } from "@/shared/lib/optical-model/surface-properties/manifest";

const FIXTURE_PATH = join(
  process.cwd(),
  "src/python/tests/fixtures/constructional_parameters.json",
);

describe("constructional-parameter manifest", () => {
  it("matches the fixture the Python optimizer is checked against", () => {
    const expected = `${JSON.stringify(buildConstructionalParameterManifest(), null, 2)}\n`;
    if (process.env.UPDATE_PARAMETER_MANIFEST === "1") {
      writeFileSync(FIXTURE_PATH, expected);
    }
    // Regenerate with: UPDATE_PARAMETER_MANIFEST=1 npx jest parameterManifest
    expect(readFileSync(FIXTURE_PATH, "utf8")).toBe(expected);
  });
});
