import type { AllGlassCatalogsData, CatalogGlassData } from "@/features/glass-map/types/glassMap";
import {
  buildLiveGlassCandidateRows,
  getGlassCandidateIdentity,
  getIncumbentGlassCatalog,
  mergePersistedGlassCandidateRows,
  sortGlassCandidates,
} from "@/features/optimization/lib/glassCandidateSelection";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";

/** Returns a compact catalog glass fixture with all candidate fields populated. */
function glass(): CatalogGlassData {
  return {
    refractiveIndexD: 1.5,
    refractiveIndexE: 1.501,
    abbeNumberD: 60,
    abbeNumberE: 59.9,
    partialDispersions: { P_gF: 0.5, P_fe: 0.4, P_Fd: 0.6 },
    dispersionCoeffKind: "Sellmeier3T",
    dispersionCoeffs: [1, 2, 3],
  };
}

const catalogs: AllGlassCatalogsData = {
  Hoya: { BSC7: glass() },
  Schott: { BK7: glass() },
  Special: {
    air: glass(),
    REFL: glass(),
    CaF2: glass(),
    "Fused Silica": glass(),
    Water: glass(),
    D263TECO: glass(),
    Unexpected: glass(),
  },
  Custom: { CUSTOM_A: glass() },
};

const baseModel: OpticalModel = {
  setAutoAperture: "manualAperture",
  object: { distance: 1e10, medium: "air", manufacturer: "" },
  image: { curvatureRadius: 0 },
  surfaces: [
    { label: "Default", curvatureRadius: 10, thickness: 1, medium: "BK7", manufacturer: "Schott", semiDiameter: 1 },
  ],
  specs: {
    pupil: { space: "object", type: "epd", value: 1 },
    field: { space: "object", type: "angle", maxField: 1, fields: [0], isRelative: true },
    wavelengths: { weights: [[587.562, 1]], referenceIndex: 0 },
  },
};

describe("glass candidate selection helpers", () => {
  it("returns no live rows when the catalog snapshot is absent", () => {
    expect(buildLiveGlassCandidateRows(undefined)).toEqual([]);
  });

  it("filters ineligible Special entries and retains all four supported special materials", () => {
    const rows = buildLiveGlassCandidateRows(catalogs);

    expect(rows.filter((row) => row.catalog === "Special").map((row) => row.name)).toEqual([
      "CaF2", "D263TECO", "Fused Silica", "Water",
    ]);
    expect(rows.every((row) => row.available)).toBe(true);
    expect(rows.find((row) => row.id === getGlassCandidateIdentity({ catalog: "Hoya", name: "BSC7" }))).toMatchObject({
      label: "Hoya BSC7",
      nd: 1.5,
      vd: 60,
      ne: 1.501,
      ve: 59.9,
      pgF: 0.5,
      pFe: 0.4,
      pFd: 0.6,
    });
  });

  it("sorts candidates by canonical catalog order and then name", () => {
    expect(sortGlassCandidates([
      { catalog: "Schott", name: "Z" },
      { catalog: "Hoya", name: "Z" },
      { catalog: "Hoya", name: "A" },
      { catalog: "Custom", name: "A" },
    ])).toEqual([
      { catalog: "Hoya", name: "A" },
      { catalog: "Hoya", name: "Z" },
      { catalog: "Schott", name: "Z" },
      { catalog: "Custom", name: "A" },
    ]);
  });

  it("merges stale persisted identities once and marks them unavailable", () => {
    const liveRows = buildLiveGlassCandidateRows(catalogs);
    const rows = mergePersistedGlassCandidateRows(liveRows, [
      { catalog: "Hoya", name: "BSC7" },
      { catalog: "Schott", name: "REMOVED" },
    ]);

    expect(rows.filter((row) => row.id === "Hoya\u0000BSC7")).toHaveLength(1);
    expect(rows.find((row) => row.id === "Schott\u0000REMOVED")).toEqual(expect.objectContaining({
      label: "Schott REMOVED",
      available: false,
    }));
  });

  it.each([
    [0, { medium: "CaF2", manufacturer: "" }, "Special"],
    [1, { medium: "BK7", manufacturer: "Schott" }, "Schott"],
    [1, { medium: "1.6", manufacturer: "40" }, undefined],
    [1, { medium: "AIR", manufacturer: "" }, undefined],
    [1, { medium: "refl", manufacturer: "" }, undefined],
    [1, { medium: "CUSTOM_A", manufacturer: "" }, "Custom"],
    [1, { medium: "CaF2", manufacturer: "Schott" }, "Schott"],
    [2, { medium: "BK7", manufacturer: "Schott" }, undefined],
  ] as const)("resolves incumbent catalog for surface index %s", (surfaceIndex, material, expected) => {
    const model = surfaceIndex === 0
      ? { ...baseModel, object: { ...baseModel.object, ...material } }
      : { ...baseModel, surfaces: [{ ...baseModel.surfaces[0], ...material }] };

    expect(getIncumbentGlassCatalog(model, surfaceIndex, catalogs)).toBe(expected);
  });
});
