import { createStore } from "zustand/vanilla";
import {
  _buildGlassLookupMaps,
  createGlassMapSlice,
  type GlassMapStore,
} from "@/features/glass-map/stores/glassMapStore";
import type { CatalogName } from "@/features/glass-map/types/glassMap";
import { completeAllCatalogsData } from "@/features/glass-map/lib/glassMap";

const mockGlassData = {
  refractiveIndexD: 1.5168,
  refractiveIndexE: 1.5190,
  abbeNumberD: 64.17,
  abbeNumberE: 63.96,
  partialDispersions: { P_gF: 0.5349, P_Fd: 0.41, P_fe: 0.4 },
  dispersionCoeffKind: 'Sellmeier3T' as const,
  dispersionCoeffs: [1.03961212, 0.231792344, 1.01046945, 0.00600069867, 0.0200179144, 103.560653],
};

function makeStore() {
  return createStore<GlassMapStore>(createGlassMapSlice);
}

describe("glassMapStore initial state", () => {
  it("plotType is refractiveIndex", () => {
    const store = makeStore();
    expect(store.getState().plotType).toBe("refractiveIndex");
  });

  it("abbeNumCenterLine is d", () => {
    const store = makeStore();
    expect(store.getState().abbeNumCenterLine).toBe("d");
  });

  it("partialDispersionType is P_gF", () => {
    const store = makeStore();
    expect(store.getState().partialDispersionType).toBe("P_gF");
  });

  it("all catalogs enabled", () => {
    const store = makeStore();
    const enabled = store.getState().enabledCatalogs;
    expect(enabled.CDGM).toBe(true);
    expect(enabled.Hikari).toBe(true);
    expect(enabled.Hoya).toBe(true);
    expect(enabled.Ohara).toBe(true);
    expect(enabled.Schott).toBe(true);
    expect(enabled.Sumita).toBe(true);
    expect(enabled.Special).toBe(true);
    expect(enabled.Custom).toBe(true);
  });

  it("selectedGlass is undefined", () => {
    const store = makeStore();
    expect(store.getState().selectedGlass).toBeUndefined();
  });

  it("glass catalog lookup state is empty", () => {
    const store = makeStore();
    expect(store.getState().catalogsData).toBeUndefined();
    expect(store.getState().lookupMaps).toBeUndefined();
    expect("catalogsError" in store.getState()).toBe(false);
    expect("catalogsLoaded" in store.getState()).toBe(false);
  });
});

describe("glassMapStore actions", () => {
  it("setPlotType sets partialDispersion", () => {
    const store = makeStore();
    store.getState().setPlotType("partialDispersion");
    expect(store.getState().plotType).toBe("partialDispersion");
  });

  it("setAbbeNumCenterLine sets e", () => {
    const store = makeStore();
    store.getState().setAbbeNumCenterLine("e");
    expect(store.getState().abbeNumCenterLine).toBe("e");
  });

  it("setPartialDispersionType sets P_Fd", () => {
    const store = makeStore();
    store.getState().setPartialDispersionType("P_Fd");
    expect(store.getState().partialDispersionType).toBe("P_Fd");
  });

  it("toggleCatalog disables CDGM", () => {
    const store = makeStore();
    store.getState().toggleCatalog("CDGM");
    expect(store.getState().enabledCatalogs.CDGM).toBe(false);
  });

  it("toggleCatalog re-enables CDGM", () => {
    const store = makeStore();
    store.getState().toggleCatalog("CDGM");
    store.getState().toggleCatalog("CDGM");
    expect(store.getState().enabledCatalogs.CDGM).toBe(true);
  });

  it("toggleCatalog only affects the toggled catalog", () => {
    const store = makeStore();
    store.getState().toggleCatalog("Schott");
    const enabled = store.getState().enabledCatalogs;
    expect(enabled.CDGM).toBe(true);
    expect(enabled.Schott).toBe(false);
    expect(enabled.Hoya).toBe(true);
  });

  it("setSelectedGlass sets a glass", () => {
    const store = makeStore();
    const glass = { catalogName: "Schott" as CatalogName, glassName: "N-BK7", data: mockGlassData };
    store.getState().setSelectedGlass(glass);
    expect(store.getState().selectedGlass).toBe(glass);
  });

  it("setSelectedGlass clears with undefined", () => {
    const store = makeStore();
    const glass = { catalogName: "Schott" as CatalogName, glassName: "N-BK7", data: mockGlassData };
    store.getState().setSelectedGlass(glass);
    store.getState().setSelectedGlass(undefined);
    expect(store.getState().selectedGlass).toBeUndefined();
  });

  it("enableCatalog turns a disabled catalog back on", () => {
    const store = makeStore();
    store.getState().toggleCatalog("Schott");

    store.getState().enableCatalog("Schott");

    expect(store.getState().enabledCatalogs.Schott).toBe(true);
  });

  it("does not expose load status or result actions", () => {
    const store = makeStore();

    expect("setGlassCatalogsResult" in store.getState()).toBe(false);
  });

  it("setCatalogsData stores catalog data and lookup maps", () => {
    const store = makeStore();
    const data = completeAllCatalogsData({
      Schott: { "N-BK7": mockGlassData },
    });

    store.getState().setCatalogsData(data);

    expect(store.getState().catalogsData).toEqual(data);
    expect(store.getState().lookupMaps?.mediumMap.get("schott:n-bk7")).toEqual({
      medium: "N-BK7",
      manufacturer: "Schott",
    });
  });

  it("upsertCustomGlasses merges custom data and rebuilds lookups", () => {
    const store = makeStore();
    store.getState().setCatalogsData(completeAllCatalogsData({}));

    store.getState().upsertCustomGlasses({
      CUSTOM_A: { ...mockGlassData, dispersionCoeffKind: "tabulated", dispersionCoeffs: [[587.56, 1.5168]] },
    });

    expect(store.getState().catalogsData?.Custom.CUSTOM_A?.dispersionCoeffKind).toBe("tabulated");
    expect(store.getState().lookupMaps?.mediumMap.get("custom:custom_a")).toEqual({
      medium: "CUSTOM_A",
      manufacturer: "Custom",
    });
    expect(store.getState().lookupMaps?.customMediumMap.get("custom_a")).toEqual({
      medium: "CUSTOM_A",
      manufacturer: "Custom",
    });
  });

  it("deleteCustomGlasses removes custom data, rebuilds lookups, and clears deleted selection", () => {
    const store = makeStore();
    const custom = { ...mockGlassData, dispersionCoeffKind: "tabulated" as const, dispersionCoeffs: [[587.56, 1.5168] as const] };
    store.getState().setCatalogsData(completeAllCatalogsData({ Custom: { CUSTOM_A: custom } }));
    store.getState().setSelectedGlass({ catalogName: "Custom", glassName: "CUSTOM_A", data: custom });

    store.getState().deleteCustomGlasses(["CUSTOM_A"]);

    expect(store.getState().catalogsData?.Custom.CUSTOM_A).toBeUndefined();
    expect(store.getState().lookupMaps?.mediumMap.get("custom:custom_a")).toBeUndefined();
    expect(store.getState().lookupMaps?.customMediumMap.get("custom_a")).toBeUndefined();
    expect(store.getState().selectedGlass).toBeUndefined();
  });

  it("setCatalogsData replaces catalog data and rebuilds lookups", () => {
    const store = makeStore();
    const initialData = completeAllCatalogsData({
      Schott: { "N-BK7": mockGlassData },
    });
    const data = completeAllCatalogsData({
      Hoya: { "H-FK61": mockGlassData },
    });
    store.getState().setCatalogsData(initialData);

    store.getState().setCatalogsData(data);

    expect(store.getState().catalogsData).toEqual(data);
    expect(store.getState().lookupMaps?.mediumMap.get("hoya:h-fk61")).toEqual({
      medium: "H-FK61",
      manufacturer: "Hoya",
    });
    expect(store.getState().lookupMaps?.mediumMap.get("schott:n-bk7")).toBeUndefined();
  });
});

describe("_buildGlassLookupMaps", () => {
  const rawCatalogsData = completeAllCatalogsData({
    CDGM: { BK7: mockGlassData },
    Hoya: { "H-LaK52": mockGlassData },
    Schott: { "N-BK7": mockGlassData },
    Special: { CaF2: mockGlassData },
  });

  it("maps manufacturer casing to canonical catalog names", () => {
    const result = _buildGlassLookupMaps(rawCatalogsData);

    expect(result.manufacturerMap.get("hoya")).toBe("Hoya");
  });

  it("maps catalog glass casing to canonical app values", () => {
    const result = _buildGlassLookupMaps(rawCatalogsData);

    expect(result.mediumMap.get("hoya:h-lak52")).toEqual({
      medium: "H-LaK52",
      manufacturer: "Hoya",
    });
  });

  it("keeps catalog-scoped built-in lookup behavior unchanged", () => {
    const result = _buildGlassLookupMaps(rawCatalogsData);

    expect(result.mediumMap.get("bk7")).toBeUndefined();
    expect(result.mediumMap.get("cdgm:bk7")).toEqual({
      medium: "BK7",
      manufacturer: "CDGM",
    });
  });

  it("maps custom glass by label only as a user-defined material", () => {
    const catalogsData = completeAllCatalogsData({
      ...rawCatalogsData,
      Custom: { CUSTOM_A: mockGlassData },
    });
    const result = _buildGlassLookupMaps(catalogsData);

    expect(result.customMediumMap.get("custom_a")).toEqual({
      medium: "CUSTOM_A",
      manufacturer: "Custom",
    });
  });

  it("maps special media aliases without a manufacturer", () => {
    const result = _buildGlassLookupMaps(rawCatalogsData);

    expect(result.mediumMap.get("fluorite")).toEqual({ medium: "CaF2", manufacturer: "" });
    expect(result.mediumMap.get("fluorspar")).toEqual({ medium: "CaF2", manufacturer: "" });
    expect(result.mediumMap.get("caf2")).toEqual({ medium: "CaF2", manufacturer: "" });
  });

  it("maps provider-backed D263TECO Special lookup without a manufacturer", () => {
    const catalogsData = completeAllCatalogsData({
      ...rawCatalogsData,
      Special: { D263TECO: mockGlassData },
    });
    const result = _buildGlassLookupMaps(catalogsData);

    expect(result.mediumMap.get("d263teco")).toEqual({ medium: "D263TECO", manufacturer: "" });
  });

  it("does not add a lowercase alias for reflective media", () => {
    const catalogsData = completeAllCatalogsData({
      ...rawCatalogsData,
      Special: { REFL: mockGlassData },
    });
    const result = _buildGlassLookupMaps(catalogsData);

    expect(result.mediumMap.get("refl")).toBeUndefined();
  });
});
