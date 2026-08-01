import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("exact real-ray optical specifications documentation", () => {
  const document = readFileSync(
    join(process.cwd(), "docs/exact-real-ray-optical-specs.md"),
    "utf8"
  );

  it("uses GitHub-compatible inverse-trig math notation", () => {
    expect(document).not.toMatch(/\\!/);
    expect(document).toContain(String.raw`\arccos\left(`);
    expect(document).toContain(
      String.raw`\arctan\left(\frac{1}{2(F/\mathrm{number})}\right)`
    );
  });
});
