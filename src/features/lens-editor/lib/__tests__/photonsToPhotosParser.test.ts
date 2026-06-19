import { readFileSync } from "fs";
import path from "path";
import type { GlassLookupMaps } from "@/features/glass-map/types/glassMap";
import { parsePhotonsToPhotosText } from "@/features/lens-editor/lib/photonsToPhotosParser";
import { validateImportedLensData } from "@/shared/lib/schemas/importSchema";

const dataDir = path.join(process.cwd(), "src/__tests__/data/photons-to-photos");

function readFixture(name: string): string {
  return readFileSync(path.join(dataDir, name), "utf8");
}

function makeSingleSurfaceText({
  nd,
  vd,
  glassName,
  catalog,
}: {
  readonly nd: string;
  readonly vd: string;
  readonly glassName: string;
  readonly catalog: string;
}): string {
  return [
    "[descriptive data]",
    "title\tParser material test",
    "[variable distances]",
    "Focal Length\t50",
    "F-Number\t4",
    "Angle of View\t20",
    "d0\tInfinity",
    "[lens data]",
    ["1", "100", "5", nd, "20", vd, glassName, catalog].join("\t"),
  ].join("\n");
}

function makeObjectSideText({
  nd,
  vd,
  glassName,
  catalog,
}: {
  readonly nd: string;
  readonly vd: string;
  readonly glassName: string;
  readonly catalog: string;
}): string {
  return [
    "[descriptive data]",
    "title\tParser object-side material test",
    "[variable distances]",
    "Focal Length\t50",
    "F-Number\t4",
    "Angle of View\t20",
    "d0\t0",
    "[lens data]",
    ["1", "Infinity", "5", nd, "20", vd, glassName, catalog].join("\t"),
    ["2", "100", "5", "1.5", "20", "60", "", ""].join("\t"),
  ].join("\n");
}

function parseSingleSurfaceMaterial(
  row: Parameters<typeof makeSingleSurfaceText>[0],
  lookupMaps?: GlassLookupMaps,
) {
  const result = parsePhotonsToPhotosText(makeSingleSurfaceText(row), lookupMaps);
  expect(result.kind).toBe("prime");
  if (result.kind !== "prime") throw new Error("Expected prime result");
  return result.model.surfaces[0];
}

const lookupMaps: GlassLookupMaps = {
  manufacturerMap: new Map([["hoya", "Hoya"]]),
  mediumMap: new Map([
    ["hoya:h-lak52", { medium: "H-LaK52", manufacturer: "Hoya" }],
    ["caf2", { medium: "CaF2", manufacturer: "" }],
    ["fused silica", { medium: "Fused silica", manufacturer: "" }],
    ["water", { medium: "Water", manufacturer: "" }],
    ["fluorite", { medium: "CaF2", manufacturer: "" }],
    ["fluorspar", { medium: "CaF2", manufacturer: "" }],
  ]),
};

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
      medium: "1.805189",
      manufacturer: "25.47729",
    });
    expect(result.model.surfaces[10]).toMatchObject({
      label: "Stop",
      curvatureRadius: 0,
      medium: "air",
      manufacturer: "",
    });
  });

  it("resolves lowercase catalogs to canonical manufacturers from lookup maps", () => {
    const surface = parseSingleSurfaceMaterial(
      { nd: "1.713", vd: "53.8", glassName: "H-LaK52", catalog: "hoya" },
      lookupMaps,
    );

    expect(surface).toMatchObject({ medium: "H-LaK52", manufacturer: "Hoya" });
  });

  it("resolves case-mismatched glass names to canonical media from lookup maps", () => {
    const surface = parseSingleSurfaceMaterial(
      { nd: "1.713", vd: "53.8", glassName: "H-LAK52", catalog: "HOYA" },
      lookupMaps,
    );

    expect(surface).toMatchObject({ medium: "H-LaK52", manufacturer: "Hoya" });
  });

  it.each([
    ["fluorite", "CaF2"],
    ["fluorspar", "CaF2"],
    ["CaF2", "CaF2"],
    ["Fused silica", "Fused silica"],
    ["Water", "Water"],
  ])("parses special medium %s without a manufacturer", (glassName, expectedMedium) => {
    const surface = parseSingleSurfaceMaterial(
      { nd: "1.433", vd: "95.2", glassName, catalog: "" },
      lookupMaps,
    );

    expect(surface).toMatchObject({ medium: expectedMedium, manufacturer: "" });
  });

  it("falls back to model glass when a named glass is unsupported", () => {
    const surface = parseSingleSurfaceMaterial(
      { nd: "1.654", vd: "39.1", glassName: "UNKNOWN", catalog: "HOYA" },
      lookupMaps,
    );

    expect(surface).toMatchObject({ medium: "1.654", manufacturer: "39.1" });
  });

  it("falls back to model glass when unsupported named glass has model-glass values without lookup maps", () => {
    const surface = parseSingleSurfaceMaterial(
      { nd: "1.654", vd: "39.1", glassName: "UNKNOWN", catalog: "HOYA" },
    );

    expect(surface).toMatchObject({ medium: "1.654", manufacturer: "39.1" });
  });

  it("falls back to blank manufacturer when unsupported named glass has nd but no vd", () => {
    const surface = parseSingleSurfaceMaterial(
      { nd: "1.654", vd: "", glassName: "UNKNOWN", catalog: "HOYA" },
    );

    expect(surface).toMatchObject({ medium: "1.654", manufacturer: "" });
  });

  it("falls back to air when unsupported named glass has no model-glass values", () => {
    const surface = parseSingleSurfaceMaterial(
      { nd: "", vd: "", glassName: "sample", catalog: "" },
    );

    expect(surface).toMatchObject({ medium: "air", manufacturer: "" });
  });

  it("falls back to air for unsupported object-side glass without model-glass values", () => {
    const result = parsePhotonsToPhotosText(
      makeObjectSideText({ nd: "", vd: "", glassName: "sample", catalog: "" }),
    );

    expect(result.kind).toBe("prime");
    if (result.kind !== "prime") throw new Error("Expected prime result");
    expect(result.model.object).toEqual({
      distance: 5,
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

  it("parses finite microscope objectives with NA and image-height specs", () => {
    const result = parsePhotonsToPhotosText(readFixture("microscope-objective-finite.txt"));

    expect(result.kind).toBe("prime");
    if (result.kind !== "prime") throw new Error("Expected prime result");

    expect(validateImportedLensData(result.model)).toBe(true);
    expect(result.model.object).toEqual({
      distance: 0.17,
      medium: "1.51502",
      manufacturer: "",
    });
    expect(result.model.surfaces[0]).toMatchObject({
      thickness: 0,
      medium: "air",
      manufacturer: "",
      semiDiameter: 1.5,
    });
    expect(result.model.specs.pupil).toEqual({ space: "object", type: "NA", value: 1.35 });
    expect(result.model.specs.field).toEqual({
      space: "image",
      type: "height",
      maxField: 20,
      fields: [0, 0.707, 1],
      isRelative: true,
      isWideAngle: true,
    });
  });

  it("parses imaging microscope objectives with flat FS rows", () => {
    const result = parsePhotonsToPhotosText(readFixture("microscope-objective-imaging.txt"));

    expect(result.kind).toBe("prime");
    if (result.kind !== "prime") throw new Error("Expected prime result");

    expect(validateImportedLensData(result.model)).toBe(true);
    expect(result.model.object).toEqual({
      distance: 0.12,
      medium: "1.48749",
      manufacturer: "70.23",
    });
    expect(result.model.surfaces[0]).toMatchObject({
      thickness: 0.3,
      medium: "air",
      manufacturer: "",
      semiDiameter: 1.8,
    });
    expect(result.model.specs.pupil).toEqual({ space: "object", type: "NA", value: 0.8 });
    expect(result.model.specs.field).toEqual({
      space: "image",
      type: "height",
      maxField: 12,
      fields: [0, 0.707, 1],
      isRelative: true,
      isWideAngle: true,
    });
    expect(result.model.surfaces[11]).toMatchObject({
      label: "Default",
      curvatureRadius: 0,
      thickness: 1.5,
      medium: "air",
      manufacturer: "",
      semiDiameter: 5e9,
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
