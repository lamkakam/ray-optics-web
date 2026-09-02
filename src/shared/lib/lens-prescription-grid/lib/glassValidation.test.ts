import {
  formatMissingGlassMessage,
  getMissingPrescriptionGlasses,
  resolvePrescriptionMedia,
  resolvePrescriptionMedium,
} from "@/shared/lib/lens-prescription-grid/lib/glassValidation";
import type { GlassLookupMaps } from "@/features/glass-map/types/glassMap";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";

function makeLookupMaps(keys: readonly string[]): GlassLookupMaps {
  return {
    manufacturerMap: new Map(),
    mediumMap: new Map(keys.map((key) => [key, { medium: key, manufacturer: "" }])),
    customMediumMap: new Map(),
  };
}

const baseModel: OpticalModel = {
  setAutoAperture: "manualAperture",
  object: { distance: 1e10, medium: "air", manufacturer: "" },
  image: { curvatureRadius: 0 },
  surfaces: [],
  specs: {
    pupil: { space: "object", type: "epd", value: 10 },
    field: { space: "object", type: "angle", maxField: 10, fields: [0], isRelative: true },
    wavelengths: { weights: [[587.6, 1]], referenceIndex: 0 },
  },
};

function modelWithMedia(media: ReadonlyArray<readonly [string, string]>): OpticalModel {
  return {
    ...baseModel,
    surfaces: media.map(([medium, manufacturer]) => ({
      label: "Default",
      curvatureRadius: 10,
      thickness: 2,
      medium,
      manufacturer,
      semiDiameter: 3,
    })),
  };
}

describe("glassValidation", () => {
  it.each([
    [{ medium: " AIR ", manufacturer: "anything" }, { medium: "air", manufacturer: "" }],
    [{ medium: "refl", manufacturer: "" }, { medium: "REFL", manufacturer: "" }],
    [{ medium: " 1.458 ", manufacturer: " 51.38 " }, { medium: "1.458", manufacturer: "51.38" }],
  ])("canonicalizes lookup-independent medium %#", (input, expected) => {
    expect(resolvePrescriptionMedium(input, undefined)).toEqual({ kind: "resolved", value: expected });
  });

  it("resolves Special, catalog, and Custom media in precedence order", () => {
    const maps: GlassLookupMaps = {
      manufacturerMap: new Map([["schott", "Schott"]]),
      mediumMap: new Map([
        ["water", { medium: "Water", manufacturer: "" }],
        ["schott:n-bk7", { medium: "N-BK7", manufacturer: "Schott" }],
      ]),
      customMediumMap: new Map([
        ["n-bk7", { medium: "My N-BK7", manufacturer: "Custom" }],
        ["user glass", { medium: "User Glass", manufacturer: "Custom" }],
      ]),
    };

    expect(resolvePrescriptionMedium({ medium: "water", manufacturer: "Schott" }, maps)).toEqual({
      kind: "resolved", value: { medium: "Water", manufacturer: "" },
    });
    expect(resolvePrescriptionMedium({ medium: "n-bk7", manufacturer: "SCHOTT" }, maps)).toEqual({
      kind: "resolved", value: { medium: "N-BK7", manufacturer: "Schott" },
    });
    expect(resolvePrescriptionMedium({ medium: "USER GLASS", manufacturer: "wrong" }, maps)).toEqual({
      kind: "resolved", value: { medium: "User Glass", manufacturer: "Custom" },
    });
  });

  it("distinguishes unavailable catalogs from an unknown medium", () => {
    expect(resolvePrescriptionMedium({ medium: "N-BK7", manufacturer: "Schott" }, undefined)).toEqual({
      kind: "catalog-unavailable",
    });
    expect(resolvePrescriptionMedium({ medium: "N-BK7", manufacturer: "Schott" }, makeLookupMaps([]))).toEqual({
      kind: "unknown-medium", medium: "N-BK7", manufacturer: "Schott",
    });
  });

  it("canonicalizes a whole prescription and reports all unknown rows with JSON-pointer paths", () => {
    const model = {
      ...modelWithMedia([["n-bk7", "SCHOTT"], ["missing", "Hoya"], ["MISSING", "hoya"]]),
      object: { distance: 1e10, medium: "AIR", manufacturer: "ignored" },
    };
    const maps: GlassLookupMaps = {
      manufacturerMap: new Map([["schott", "Schott"], ["hoya", "Hoya"]]),
      mediumMap: new Map([["schott:n-bk7", { medium: "N-BK7", manufacturer: "Schott" }]]),
      customMediumMap: new Map(),
    };
    expect(resolvePrescriptionMedia(model, maps)).toEqual({
      kind: "unknown-medium",
      issues: [
        { path: "/surfaces/1/medium", medium: "missing", manufacturer: "Hoya" },
        { path: "/surfaces/2/medium", medium: "MISSING", manufacturer: "hoya" },
      ],
    });

    expect(resolvePrescriptionMedia(modelWithMedia([["n-bk7", "SCHOTT"]]), maps)).toEqual({
      kind: "resolved",
      model: expect.objectContaining({
        object: { distance: 1e10, medium: "air", manufacturer: "" },
        surfaces: [expect.objectContaining({ medium: "N-BK7", manufacturer: "Schott" })],
      }),
    });
  });

  it("reports unavailable catalogs for whole-prescription resolution", () => {
    expect(resolvePrescriptionMedia(modelWithMedia([["N-BK7", "Schott"]]), undefined)).toEqual({
      kind: "catalog-unavailable",
      path: "/object/medium",
    });
  });

  it("passes when a built-in catalog glass exists in the lookup map", () => {
    expect(getMissingPrescriptionGlasses(
      modelWithMedia([["N-BK7", "Schott"]]),
      makeLookupMaps(["schott:n-bk7"]),
    )).toEqual([]);
  });

  it("passes custom glass with empty manufacturer via the custom lookup key", () => {
    expect(getMissingPrescriptionGlasses(
      modelWithMedia([["MY_GLASS", ""]]),
      makeLookupMaps(["custom:my_glass"]),
    )).toEqual([]);
  });

  it("reports missing catalog glass", () => {
    expect(getMissingPrescriptionGlasses(
      modelWithMedia([["N-BK7", "Schott"]]),
      makeLookupMaps([]),
    )).toEqual(["Schott: N-BK7"]);
  });

  it("reports missing custom glass with empty manufacturer", () => {
    expect(getMissingPrescriptionGlasses(
      modelWithMedia([["MY_GLASS", ""]]),
      makeLookupMaps([]),
    )).toEqual(["Custom: MY_GLASS"]);
  });

  it("passes special media through the plain lookup key", () => {
    expect(getMissingPrescriptionGlasses(
      modelWithMedia([["Fused silica", ""], ["Water", ""]]),
      makeLookupMaps(["fused silica", "water"]),
    )).toEqual([]);
  });

  it("allows air and REFL without lookup entries", () => {
    expect(getMissingPrescriptionGlasses(
      modelWithMedia([["air", ""], ["REFL", ""]]),
      makeLookupMaps([]),
    )).toEqual([]);
  });

  it("passes model glass with a numeric refractive index and empty manufacturer", () => {
    expect(getMissingPrescriptionGlasses(
      modelWithMedia([["1.458", ""]]),
      makeLookupMaps([]),
    )).toEqual([]);
  });

  it("passes model glass with a numeric refractive index and numeric Abbe number", () => {
    expect(getMissingPrescriptionGlasses(
      modelWithMedia([["1.458", "51.38"]]),
      makeLookupMaps([]),
    )).toEqual([]);
  });

  it("reports numeric refractive index with nonnumeric manufacturer as missing catalog glass", () => {
    expect(getMissingPrescriptionGlasses(
      modelWithMedia([["1.458", "Schott"]]),
      makeLookupMaps([]),
    )).toEqual(["Schott: 1.458"]);
  });

  it("deduplicates missing glasses", () => {
    expect(getMissingPrescriptionGlasses(
      modelWithMedia([["N-BK7", "Schott"], ["N-BK7", "Schott"], ["MY_GLASS", ""]]),
      makeLookupMaps([]),
    )).toEqual(["Schott: N-BK7", "Custom: MY_GLASS"]);
  });

  it("allows validation while lookup maps are unavailable", () => {
    expect(getMissingPrescriptionGlasses(
      modelWithMedia([["N-BK7", "Schott"]]),
      undefined,
    )).toEqual([]);
  });

  it("formats the default validation error message", () => {
    expect(formatMissingGlassMessage(["Schott: N-BK7", "Custom: MY_GLASS"])).toBe(
      "Unknown glass in prescription: Schott: N-BK7, Custom: MY_GLASS. Select a glass that exists in the loaded glass catalog or add it as a custom glass.",
    );
  });
});
