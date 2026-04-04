import { type StateCreator } from "zustand";
import {
  CATALOG_NAMES,
  type AllGlassCatalogsData,
  type AbbeNumCenterLine,
  type CatalogName,
  type GlassMapPlotType,
  type PartialDispersionType,
  type SelectedGlass,
} from "@/shared/lib/types/glassMap";

export interface GlassMapState {
  catalogsData: AllGlassCatalogsData | undefined;
  dataLoading: boolean;
  dataError: string | undefined;
  plotType: GlassMapPlotType;
  abbeNumCenterLine: AbbeNumCenterLine;
  partialDispersionType: PartialDispersionType;
  enabledCatalogs: Record<CatalogName, boolean>;
  selectedGlass: SelectedGlass | undefined;
  pendingRouteIntent: GlassMapRouteIntent | undefined;
}

export interface GlassMapRouteIntent {
  readonly source: "medium-selector";
  readonly catalog: string;
  readonly glass: string;
}

export interface GlassMapActions {
  setCatalogsData(data: AllGlassCatalogsData): void;
  setDataLoading(v: boolean): void;
  setDataError(e: string | undefined): void;
  setRouteIntent(routeIntent: GlassMapRouteIntent | undefined): void;
  setPlotType(t: GlassMapPlotType): void;
  setAbbeNumCenterLine(l: AbbeNumCenterLine): void;
  setPartialDispersionType(t: PartialDispersionType): void;
  toggleCatalog(name: CatalogName): void;
  enableCatalog(name: CatalogName): void;
  setSelectedGlass(glass: SelectedGlass | undefined): void;
}

export type GlassMapStore = GlassMapState & GlassMapActions;

const allEnabled = Object.fromEntries(
  CATALOG_NAMES.map((name) => [name, true])
) as Record<CatalogName, boolean>;

function isCatalogName(value: string): value is CatalogName {
  return CATALOG_NAMES.includes(value as CatalogName);
}

export const createGlassMapSlice =
  (initialRouteIntent?: GlassMapRouteIntent): StateCreator<GlassMapStore> =>
  (set) => ({
    catalogsData: undefined,
    dataLoading: false,
    dataError: undefined,
    plotType: 'refractiveIndex',
    abbeNumCenterLine: 'd',
    partialDispersionType: 'P_g_F',
    enabledCatalogs: { ...allEnabled },
    selectedGlass: undefined,
    pendingRouteIntent: initialRouteIntent,

  setCatalogsData: (data) =>
    set((state) => {
      const pendingRouteIntent = state.pendingRouteIntent;
      if (
        pendingRouteIntent === undefined ||
        !isCatalogName(pendingRouteIntent.catalog)
      ) {
        return {
          catalogsData: data,
          pendingRouteIntent: undefined,
        };
      }

      const catalog = data[pendingRouteIntent.catalog];
      const selectedGlassData = catalog[pendingRouteIntent.glass];

      if (selectedGlassData === undefined) {
        return {
          catalogsData: data,
          pendingRouteIntent: undefined,
        };
      }

      return {
        catalogsData: data,
        enabledCatalogs: {
          ...state.enabledCatalogs,
          [pendingRouteIntent.catalog]: true,
        },
        selectedGlass: {
          catalogName: pendingRouteIntent.catalog,
          glassName: pendingRouteIntent.glass,
          data: selectedGlassData,
        },
        pendingRouteIntent: undefined,
      };
    }),
  setDataLoading: (v) => set({ dataLoading: v }),
  setDataError: (e) => set({ dataError: e }),
  setRouteIntent: (routeIntent) =>
    set((state) => {
      if (routeIntent === undefined) {
        return { pendingRouteIntent: undefined };
      }

      if (
        state.catalogsData === undefined ||
        !isCatalogName(routeIntent.catalog)
      ) {
        return { pendingRouteIntent: routeIntent };
      }

      const catalog = state.catalogsData[routeIntent.catalog];
      const selectedGlassData = catalog[routeIntent.glass];

      if (selectedGlassData === undefined) {
        return { pendingRouteIntent: undefined };
      }

      return {
        enabledCatalogs: {
          ...state.enabledCatalogs,
          [routeIntent.catalog]: true,
        },
        selectedGlass: {
          catalogName: routeIntent.catalog,
          glassName: routeIntent.glass,
          data: selectedGlassData,
        },
        pendingRouteIntent: undefined,
      };
    }),
  setPlotType: (t) => set({ plotType: t }),
  setAbbeNumCenterLine: (l) => set({ abbeNumCenterLine: l }),
  setPartialDispersionType: (t) => set({ partialDispersionType: t }),
  toggleCatalog: (name) =>
    set((state) => ({
      enabledCatalogs: {
        ...state.enabledCatalogs,
        [name]: !state.enabledCatalogs[name],
      },
    })),
  enableCatalog: (name) =>
    set((state) => ({
      enabledCatalogs: {
        ...state.enabledCatalogs,
        [name]: true,
      },
    })),
  setSelectedGlass: (glass) => set({ selectedGlass: glass }),
});
