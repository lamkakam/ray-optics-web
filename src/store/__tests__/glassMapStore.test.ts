import { createStore } from "zustand/vanilla";
import {
  createGlassMapSlice,
  type GlassMapStore,
} from "@/store/glassMapStore";
import type { AllGlassCatalogsData, CatalogName } from "@/lib/glassMap";

const mockGlassData = {
  refractiveIndexD: 1.5168,
  refractiveIndexE: 1.5190,
  abbeNumberD: 64.17,
  abbeNumberE: 63.96,
  partialDispersions: { P_g_F: 0.5349, P_F_d: 0.41, P_F_e: 0.4 },
  dispersionCoeffKind: 'Sellmeier3T' as const,
  dispersionCoeffs: [1.03961212, 0.231792344, 1.01046945, 0.00600069867, 0.0200179144, 103.560653],
};

const mockCatalogsData: AllGlassCatalogsData = {
  CDGM: { BK7: mockGlassData },
  Hikari: {},
  Hoya: {},
  Ohara: {},
  Schott: {},
  Sumita: {},
  Special: {},
};

function makeStore() {
  return createStore<GlassMapStore>(createGlassMapSlice);
}

describe("glassMapStore initial state", () => {
  it("catalogsData is undefined", () => {
    const store = makeStore();
    expect(store.getState().catalogsData).toBeUndefined();
  });

  it("dataLoading is false", () => {
    const store = makeStore();
    expect(store.getState().dataLoading).toBe(false);
  });

  it("dataError is undefined", () => {
    const store = makeStore();
    expect(store.getState().dataError).toBeUndefined();
  });

  it("plotType is refractiveIndex", () => {
    const store = makeStore();
    expect(store.getState().plotType).toBe("refractiveIndex");
  });

  it("abbeNumCenterLine is d", () => {
    const store = makeStore();
    expect(store.getState().abbeNumCenterLine).toBe("d");
  });

  it("partialDispersionType is P_g_F", () => {
    const store = makeStore();
    expect(store.getState().partialDispersionType).toBe("P_g_F");
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
  });

  it("selectedGlass is undefined", () => {
    const store = makeStore();
    expect(store.getState().selectedGlass).toBeUndefined();
  });
});

describe("glassMapStore actions", () => {
  it("setCatalogsData sets data", () => {
    const store = makeStore();
    store.getState().setCatalogsData(mockCatalogsData);
    expect(store.getState().catalogsData).toBe(mockCatalogsData);
  });

  it("setDataLoading sets true", () => {
    const store = makeStore();
    store.getState().setDataLoading(true);
    expect(store.getState().dataLoading).toBe(true);
  });

  it("setDataError sets error string", () => {
    const store = makeStore();
    store.getState().setDataError("Network error");
    expect(store.getState().dataError).toBe("Network error");
  });

  it("setDataError clears error with undefined", () => {
    const store = makeStore();
    store.getState().setDataError("err");
    store.getState().setDataError(undefined);
    expect(store.getState().dataError).toBeUndefined();
  });

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

  it("setPartialDispersionType sets P_F_d", () => {
    const store = makeStore();
    store.getState().setPartialDispersionType("P_F_d");
    expect(store.getState().partialDispersionType).toBe("P_F_d");
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
});
