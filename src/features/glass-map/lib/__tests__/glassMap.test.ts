import {
  buildGlassLookupMaps,
  completeAllCatalogsData,
  computePlotPoints,
  CATALOG_COLOR_MAP,
  getEligibleGlassNames,
  resolveCatalogGlass,
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

const completeCatalogsData = completeAllCatalogsData(rawCatalogsData);
const lookupMaps = buildGlassLookupMaps(completeCatalogsData);

describe("CATALOG_NAMES", () => {
  it("contains all catalog names including Custom", () => {
    expect(CATALOG_NAMES).toContain("CDGM");
    expect(CATALOG_NAMES).toContain("Hikari");
    expect(CATALOG_NAMES).toContain("Hoya");
    expect(CATALOG_NAMES).toContain("Ohara");
    expect(CATALOG_NAMES).toContain("Schott");
    expect(CATALOG_NAMES).toContain("Sumita");
    expect(CATALOG_NAMES).toContain("Special");
    expect(CATALOG_NAMES).toContain("Custom");
    expect(CATALOG_NAMES.length).toBe(8);
  });
});

describe("catalog glass resolution", () => {
  it("resolves catalog and glass names case-insensitively with stored spelling", () => {
    expect(resolveCatalogGlass(completeCatalogsData, lookupMaps, "schott", "n-bk7")).toEqual({
      catalogName: "Schott",
      glassName: "N-BK7",
      data: rawGlass,
    });
  });

  it("normalizes surrounding whitespace through the canonical lookup maps", () => {
    expect(resolveCatalogGlass(completeCatalogsData, lookupMaps, "  schott ", " N-BK7  "))
      .toEqual({ catalogName: "Schott", glassName: "N-BK7", data: rawGlass });
  });

  it("rejects unknown catalogs, partial matches, aliases, and excluded Special media", () => {
    const specialCatalogs = completeAllCatalogsData({
      ...rawCatalogsData,
      Special: { air: rawGlass, REFL: rawGlass, CaF2: rawGlass, Water: rawGlass },
    });
    const specialLookups = buildGlassLookupMaps(specialCatalogs);

    expect(resolveCatalogGlass(completeCatalogsData, lookupMaps, "Unknown", "N-BK7")).toBeUndefined();
    expect(resolveCatalogGlass(completeCatalogsData, lookupMaps, "Schott", "N-B")).toBeUndefined();
    expect(resolveCatalogGlass(specialCatalogs, specialLookups, "Special", "fluorite")).toBeUndefined();
    expect(resolveCatalogGlass(specialCatalogs, specialLookups, "Special", "AIR")).toBeUndefined();
    expect(resolveCatalogGlass(specialCatalogs, specialLookups, "Special", "refl")).toBeUndefined();
    expect(getEligibleGlassNames({ ...rawCatalogsData, Special: { air: rawGlass, REFL: rawGlass, Water: rawGlass } }, "Special"))
      .toEqual(["Water"]);
  });

  it("resolves Custom glass through the catalog-scoped medium map", () => {
    const catalogsData = completeAllCatalogsData({ Custom: { "My Glass": rawGlass } });
    const maps = buildGlassLookupMaps(catalogsData);

    expect(resolveCatalogGlass(catalogsData, maps, " custom ", " my glass ")).toEqual({
      catalogName: "Custom",
      glassName: "My Glass",
      data: rawGlass,
    });
  });
});

describe("buildGlassLookupMaps", () => {
  it("builds canonical manufacturer, catalog glass, Custom, and Special lookups", () => {
    const catalogsData = completeAllCatalogsData({
      Hoya: { "H-LaK52": rawGlass },
      Special: { D263TECO: rawGlass, REFL: rawGlass },
      Custom: { CUSTOM_A: rawGlass },
    });
    const result = buildGlassLookupMaps(catalogsData);

    expect(result.manufacturerMap.get("hoya")).toBe("Hoya");
    expect(result.mediumMap.get("hoya:h-lak52")).toEqual({ medium: "H-LaK52", manufacturer: "Hoya" });
    expect(result.mediumMap.get("h-lak52")).toBeUndefined();
    expect(result.mediumMap.get("d263teco")).toEqual({ medium: "D263TECO", manufacturer: "" });
    expect(result.mediumMap.get("refl")).toBeUndefined();
    expect(result.mediumMap.get("fluorite")).toEqual({ medium: "CaF2", manufacturer: "" });
    expect(result.mediumMap.get("fluorspar")).toEqual({ medium: "CaF2", manufacturer: "" });
    expect(result.mediumMap.get("custom:custom_a")).toEqual({ medium: "CUSTOM_A", manufacturer: "Custom" });
    expect(result.customMediumMap.get("custom_a")).toEqual({ medium: "CUSTOM_A", manufacturer: "Custom" });
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
    Custom: true,
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
      CDGM: false, Hikari: false, Hoya: false, Ohara: false, Schott: false, Sumita: false, Special: false, Custom: false,
    };
    const points = computePlotPoints(catalogsData, allDisabled, "refractiveIndex", "d", "P_gF");
    expect(points).toHaveLength(0);
  });
});
