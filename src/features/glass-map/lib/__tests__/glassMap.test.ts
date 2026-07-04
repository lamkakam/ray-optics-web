import {
  completeAllCatalogsData,
  computePlotPoints,
  CATALOG_COLOR_MAP,
} from "@/features/glass-map/lib/glassMap";
import {
  CATALOG_NAMES,
} from "@/features/glass-map/types/glassMap";
import type {
  GlassData,
  AllGlassCatalogsData,
  CatalogName,
} from "@/features/glass-map/types/glassMap";

const rawGlass: GlassData = {
  refractiveIndexD: 1.5168,
  refractiveIndexE: 1.5190,
  abbeNumberD: 64.17,
  abbeNumberE: 63.96,
  partialDispersions: { P_fe: 0.4, P_Fd: 0.41, P_gF: 0.5349 },
  dispersionCoeffKind: 'Sellmeier3T',
  dispersionCoeffs: [1.03961212, 0.231792344, 1.01046945, 0.00600069867, 0.0200179144, 103.560653],
};

const rawCatalogsData: AllGlassCatalogsData = {
  CDGM: { BK7: rawGlass },
  Hikari: {},
  Hoya: { "H-LaK52": rawGlass },
  Ohara: {},
  Schott: { "N-BK7": rawGlass },
  Sumita: {},
  Special: { CaF2: rawGlass },
};

describe("CATALOG_NAMES", () => {
  it("contains all 7 catalog names", () => {
    expect(CATALOG_NAMES).toContain("CDGM");
    expect(CATALOG_NAMES).toContain("Hikari");
    expect(CATALOG_NAMES).toContain("Hoya");
    expect(CATALOG_NAMES).toContain("Ohara");
    expect(CATALOG_NAMES).toContain("Schott");
    expect(CATALOG_NAMES).toContain("Sumita");
    expect(CATALOG_NAMES).toContain("Special");
    expect(CATALOG_NAMES.length).toBe(7);
  });
});

describe("CATALOG_COLOR_MAP", () => {
  it("has a color for every catalog", () => {
    for (const name of CATALOG_NAMES) {
      expect(CATALOG_COLOR_MAP[name]).toBeDefined();
    }
  });
});

describe("completeAllCatalogsData", () => {
  it("passes through frontend-ready catalog glass data", () => {
    const result = completeAllCatalogsData(rawCatalogsData);
    expect(result.CDGM["BK7"].refractiveIndexD).toBe(1.5168);
    expect(result.Schott["N-BK7"].abbeNumberD).toBe(64.17);
  });

  it("returns empty object for empty catalog", () => {
    const result = completeAllCatalogsData(rawCatalogsData);
    expect(result.Hikari).toEqual({});
  });
});

describe("computePlotPoints", () => {
  const catalogsData: AllGlassCatalogsData = {
    CDGM: {
      BK7: {
        refractiveIndexD: 1.5168,
        refractiveIndexE: 1.519,
        abbeNumberD: 64.17,
        abbeNumberE: 63.96,
        partialDispersions: { P_gF: 0.5349, P_Fd: 0.41, P_fe: 0.4 },
        dispersionCoeffKind: 'Schott2x6',
        dispersionCoeffs: [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0],
      },
    },
    Hikari: {},
    Hoya: {},
    Ohara: {},
    Schott: {
      "N-BK7": {
        refractiveIndexD: 1.5168,
        refractiveIndexE: 1.519,
        abbeNumberD: 64.17,
        abbeNumberE: 63.96,
        partialDispersions: { P_gF: 0.5349, P_Fd: 0.41, P_fe: 0.4 },
        dispersionCoeffKind: 'Sellmeier3T',
        dispersionCoeffs: [1.03961212, 0.231792344, 1.01046945, 0.00600069867, 0.0200179144, 103.560653],
      },
    },
    Sumita: {},
    Special: {},
  };

  const allEnabled: Record<CatalogName, boolean> = {
    CDGM: true,
    Hikari: true,
    Hoya: true,
    Ohara: true,
    Schott: true,
    Sumita: true,
    Special: true,
  };

  it("returns points for refractiveIndex/d: x=Vd, y=Nd", () => {
    const points = computePlotPoints(catalogsData, allEnabled, "refractiveIndex", "d", "P_gF");
    expect(points.length).toBe(2);
    const bk7 = points.find((p) => p.glassName === "BK7")!;
    expect(bk7.x).toBe(64.17);
    expect(bk7.y).toBe(1.5168);
    expect(bk7.catalogName).toBe("CDGM");
  });

  it("returns points for refractiveIndex/e: x=Ve, y=Ne", () => {
    const points = computePlotPoints(catalogsData, allEnabled, "refractiveIndex", "e", "P_gF");
    const bk7 = points.find((p) => p.glassName === "BK7")!;
    expect(bk7.x).toBe(63.96);
    expect(bk7.y).toBe(1.519);
  });

  it("returns points for partialDispersion/d/P_gF: x=Vd, y=P_gF", () => {
    const points = computePlotPoints(catalogsData, allEnabled, "partialDispersion", "d", "P_gF");
    const bk7 = points.find((p) => p.glassName === "BK7")!;
    expect(bk7.x).toBe(64.17);
    expect(bk7.y).toBe(0.5349);
  });

  it("returns points for partialDispersion/d/P_Fd: x=Vd, y=P_Fd", () => {
    const points = computePlotPoints(catalogsData, allEnabled, "partialDispersion", "d", "P_Fd");
    const bk7 = points.find((p) => p.glassName === "BK7")!;
    expect(bk7.x).toBe(64.17);
    expect(bk7.y).toBe(0.41);
  });

  it("excludes disabled catalog", () => {
    const enabled: Record<CatalogName, boolean> = { ...allEnabled, CDGM: false };
    const points = computePlotPoints(catalogsData, enabled, "refractiveIndex", "d", "P_gF");
    expect(points.find((p) => p.catalogName === "CDGM")).toBeUndefined();
    expect(points.find((p) => p.catalogName === "Schott")).toBeDefined();
  });

  it("returns empty array when all catalogs disabled", () => {
    const allDisabled: Record<CatalogName, boolean> = {
      CDGM: false, Hikari: false, Hoya: false, Ohara: false, Schott: false, Sumita: false, Special: false,
    };
    const points = computePlotPoints(catalogsData, allDisabled, "refractiveIndex", "d", "P_gF");
    expect(points).toHaveLength(0);
  });
});
