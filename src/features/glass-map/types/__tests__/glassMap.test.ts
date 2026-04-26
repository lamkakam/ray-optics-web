import {
  normalizeGlassData,
  normalizeAllCatalogsData,
  computePlotPoints,
  CATALOG_COLOR_MAP,
  CATALOG_NAMES,
} from "@/features/glass-map/types/glassMap";
import type {
  RawGlassData,
  RawAllGlassCatalogsData,
  AllGlassCatalogsData,
  CatalogName,
} from "@/features/glass-map/types/glassMap";

const rawGlass: RawGlassData = {
  refractive_index_d: 1.5168,
  refractive_index_e: 1.5190,
  abbe_number_d: 64.17,
  abbe_number_e: 63.96,
  partial_dispersions: { P_F_e: 0.4, P_F_d: 0.41, P_g_F: 0.5349 },
  dispersion_coeff_kind: 'Sellmeier3T',
  dispersion_coeffs: [1.03961212, 0.231792344, 1.01046945, 0.00600069867, 0.0200179144, 103.560653],
};

const rawCatalogsData: RawAllGlassCatalogsData = {
  CDGM: { BK7: rawGlass },
  Hikari: {},
  Hoya: {},
  Ohara: {},
  Schott: { "N-BK7": rawGlass },
  Sumita: {},
  Special: {},
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

describe("normalizeGlassData", () => {
  it("maps snake_case fields to camelCase", () => {
    const result = normalizeGlassData(rawGlass);
    expect(result.refractiveIndexD).toBe(1.5168);
    expect(result.refractiveIndexE).toBe(1.519);
    expect(result.abbeNumberD).toBe(64.17);
    expect(result.abbeNumberE).toBe(63.96);
  });

  it("maps partial_dispersions", () => {
    const result = normalizeGlassData(rawGlass);
    expect(result.partialDispersions.P_F_e).toBe(0.4);
    expect(result.partialDispersions.P_F_d).toBe(0.41);
    expect(result.partialDispersions.P_g_F).toBe(0.5349);
  });

  it("maps dispersion_coeff_kind and dispersion_coeffs", () => {
    const result = normalizeGlassData(rawGlass);
    expect(result.dispersionCoeffKind).toBe('Sellmeier3T');
    expect(result.dispersionCoeffs).toEqual([1.03961212, 0.231792344, 1.01046945, 0.00600069867, 0.0200179144, 103.560653]);
  });

  it("accepts Sellmeier4T data", () => {
    const result = normalizeGlassData({
      ...rawGlass,
      dispersion_coeff_kind: 'Sellmeier4T',
      dispersion_coeffs: [0.5684027565, 0.1726177391, 0.02086189578, 0.1130748688, 0.005101829712, 0.01821153936, 0.02620722293, 10.69792721],
    });
    expect(result.dispersionCoeffKind).toBe('Sellmeier4T');
    expect(result.dispersionCoeffs).toHaveLength(8);
  });

});

describe("normalizeAllCatalogsData", () => {
  it("normalizes all catalogs and glasses", () => {
    const result = normalizeAllCatalogsData(rawCatalogsData);
    expect(result.CDGM["BK7"].refractiveIndexD).toBe(1.5168);
    expect(result.Schott["N-BK7"].abbeNumberD).toBe(64.17);
  });

  it("returns empty object for empty catalog", () => {
    const result = normalizeAllCatalogsData(rawCatalogsData);
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
        partialDispersions: { P_g_F: 0.5349, P_F_d: 0.41, P_F_e: 0.4 },
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
        partialDispersions: { P_g_F: 0.5349, P_F_d: 0.41, P_F_e: 0.4 },
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
    const points = computePlotPoints(catalogsData, allEnabled, "refractiveIndex", "d", "P_g_F");
    expect(points.length).toBe(2);
    const bk7 = points.find((p) => p.glassName === "BK7")!;
    expect(bk7.x).toBe(64.17);
    expect(bk7.y).toBe(1.5168);
    expect(bk7.catalogName).toBe("CDGM");
  });

  it("returns points for refractiveIndex/e: x=Ve, y=Ne", () => {
    const points = computePlotPoints(catalogsData, allEnabled, "refractiveIndex", "e", "P_g_F");
    const bk7 = points.find((p) => p.glassName === "BK7")!;
    expect(bk7.x).toBe(63.96);
    expect(bk7.y).toBe(1.519);
  });

  it("returns points for partialDispersion/d/P_g_F: x=Vd, y=P_g_F", () => {
    const points = computePlotPoints(catalogsData, allEnabled, "partialDispersion", "d", "P_g_F");
    const bk7 = points.find((p) => p.glassName === "BK7")!;
    expect(bk7.x).toBe(64.17);
    expect(bk7.y).toBe(0.5349);
  });

  it("returns points for partialDispersion/d/P_F_d: x=Vd, y=P_F_d", () => {
    const points = computePlotPoints(catalogsData, allEnabled, "partialDispersion", "d", "P_F_d");
    const bk7 = points.find((p) => p.glassName === "BK7")!;
    expect(bk7.x).toBe(64.17);
    expect(bk7.y).toBe(0.41);
  });

  it("excludes disabled catalog", () => {
    const enabled: Record<CatalogName, boolean> = { ...allEnabled, CDGM: false };
    const points = computePlotPoints(catalogsData, enabled, "refractiveIndex", "d", "P_g_F");
    expect(points.find((p) => p.catalogName === "CDGM")).toBeUndefined();
    expect(points.find((p) => p.catalogName === "Schott")).toBeDefined();
  });

  it("returns empty array when all catalogs disabled", () => {
    const allDisabled: Record<CatalogName, boolean> = {
      CDGM: false, Hikari: false, Hoya: false, Ohara: false, Schott: false, Sumita: false, Special: false,
    };
    const points = computePlotPoints(catalogsData, allDisabled, "refractiveIndex", "d", "P_g_F");
    expect(points).toHaveLength(0);
  });
});
