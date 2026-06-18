import { readFileSync } from "fs";
import path from "path";
import { parsePhotonsToPhotosText } from "@/features/lens-editor/lib/photonsToPhotosParser";
import { validateImportedLensData } from "@/shared/lib/schemas/importSchema";

const dataDir = path.join(process.cwd(), "src/__tests__/data/photons-to-photos");

function readFixture(name: string): string {
  return readFileSync(path.join(dataDir, name), "utf8");
}

describe("parsePhotonsToPhotosText", () => {
  it("parses a prime file without glass names", () => {
    const result = parsePhotonsToPhotosText(readFixture("prime-no-glass-type.txt"));

    expect(result.kind).toBe("prime");
    if (result.kind !== "prime") throw new Error("Expected prime result");

    expect(validateImportedLensData(result.model)).toBe(true);
    expect(result.model.setAutoAperture).toBe("manualAperture");
    expect(result.model.object.distance).toBe(1e10);
    expect(result.model.specs.pupil).toEqual({ space: "image", type: "f/#", value: 4 });
    expect(result.model.specs.field).toEqual({
      space: "object",
      type: "angle",
      maxField: 6,
      fields: [0, 0.707, 1],
      isRelative: true,
      isWideAngle: false,
    });
    expect(result.model.surfaces[4]).toMatchObject({
      label: "Stop",
      curvatureRadius: 0,
      thickness: 4.16,
      medium: "air",
      manufacturer: "",
      semiDiameter: 18.2445,
    });
    expect(result.model.surfaces[8].thickness).toBe(103.24);
    expect(result.model.surfaces[0]).toMatchObject({
      medium: "1.5709",
      manufacturer: "63.0",
      semiDiameter: 27.15,
    });
  });

  it("parses a prime file with glass names and catalogs", () => {
    const result = parsePhotonsToPhotosText(readFixture("prime-with-glass-type.txt"));

    expect(result.kind).toBe("prime");
    if (result.kind !== "prime") throw new Error("Expected prime result");

    expect(validateImportedLensData(result.model)).toBe(true);
    expect(result.model.surfaces[0]).toMatchObject({
      medium: "H-ZF7LAGT",
      manufacturer: "CDGM",
    });
    expect(result.model.surfaces[10]).toMatchObject({
      label: "Stop",
      curvatureRadius: 0,
      medium: "air",
      manufacturer: "",
    });
  });

  it("parses inline aspherical stop rows in fisheye prime data", () => {
    const result = parsePhotonsToPhotosText(readFixture("prime-fisheye-aspherical-no-glass-type.txt"));

    expect(result.kind).toBe("prime");
    if (result.kind !== "prime") throw new Error("Expected prime result");

    expect(validateImportedLensData(result.model)).toBe(true);
    expect(result.model.specs.field.maxField).toBe(135);
    expect(result.model.specs.field.isWideAngle).toBe(true);
    expect(result.model.surfaces[12]).toMatchObject({
      label: "Stop",
      curvatureRadius: 0,
      thickness: 2.583,
      semiDiameter: 2.131,
    });
  });

  it("parses zoom files and resolves selected variable-distance columns", () => {
    const result = parsePhotonsToPhotosText(readFixture("zoom-wide-angle-aspherical-no-glass-type.txt"));

    expect(result.kind).toBe("zoom");
    if (result.kind !== "zoom") throw new Error("Expected zoom result");

    expect(result.focalLengthChoices).toEqual([
      { index: 0, focalLength: 9.193 },
      { index: 1, focalLength: 24.376 },
      { index: 2, focalLength: 64.678 },
    ]);

    const wide = result.resolve(0);
    const mid = result.resolve(1);
    const tele = result.resolve(2);

    expect(validateImportedLensData(wide)).toBe(true);
    expect(validateImportedLensData(mid)).toBe(true);
    expect(validateImportedLensData(tele)).toBe(true);
    expect(wide.specs.field.maxField).toBe(40.99);
    expect(mid.specs.field.maxField).toBe(16.779);
    expect(tele.specs.field.maxField).toBe(6.465);
    expect(wide.specs.field.isWideAngle).toBe(true);
    expect(mid.specs.field.isWideAngle).toBe(false);
    expect(tele.specs.field.isWideAngle).toBe(false);
    expect(wide.surfaces[4].thickness).toBe(1.92);
    expect(mid.surfaces[4].thickness).toBe(18.225);
    expect(tele.surfaces[4].thickness).toBe(39.492);
    expect(wide.surfaces[5].aspherical).toEqual({
      kind: "EvenAspherical",
      conicConstant: 0,
      polynomialCoefficients: [-3.93629e-5, 3.95479e-7, -1.09912e-9],
    });
    expect(wide.surfaces[26]).toMatchObject({
      curvatureRadius: 0,
      medium: "1.517",
      manufacturer: "64.166",
    });
  });

  it("rejects missing required sections", () => {
    expect(() => parsePhotonsToPhotosText("[descriptive data]\ntitle\tBad")).toThrow(
      /missing required section/i,
    );
  });

  it("rejects unresolved variable distances", () => {
    const text = readFixture("prime-no-glass-type.txt").replace("\tBf\t", "\tUnknownDistance\t");

    expect(() => parsePhotonsToPhotosText(text)).toThrow(/unresolved variable distance/i);
  });

  it("rejects aspherical radius disagreement", () => {
    const text = readFixture("zoom-wide-angle-aspherical-no-glass-type.txt").replace(
      "6\t300\t0\t-3.93629E-05",
      "6\t301\t0\t-3.93629E-05",
    );

    const result = parsePhotonsToPhotosText(text);
    expect(result.kind).toBe("zoom");
    if (result.kind !== "zoom") throw new Error("Expected zoom result");
    expect(() => result.resolve(0)).toThrow(/aspherical radius/i);
  });
});
