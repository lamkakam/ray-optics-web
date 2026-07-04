import { type StateCreator } from "zustand";
import {
  CATALOG_NAMES,
  type AbbeNumCenterLine,
  type AllGlassCatalogsData,
  type CatalogName,
  type GlassLookupMaps,
  type GlassMapPlotType,
  type PartialDispersionType,
  type SelectedGlass,
} from "@/features/glass-map/types/glassMap";
import type { GlassCatalogsLoadResult } from "@/features/glass-map/lib/glassCatalogsResource";

export interface GlassMapState {
  plotType: GlassMapPlotType;
  abbeNumCenterLine: AbbeNumCenterLine;
  partialDispersionType: PartialDispersionType;
  enabledCatalogs: Record<CatalogName, boolean>;
  selectedGlass: SelectedGlass | undefined;
  catalogsData: AllGlassCatalogsData | undefined;
  lookupMaps: GlassLookupMaps | undefined;
  catalogsError: string | undefined;
  catalogsLoaded: boolean;
}

export interface GlassMapActions {
  setPlotType(t: GlassMapPlotType): void;
  setAbbeNumCenterLine(l: AbbeNumCenterLine): void;
  setPartialDispersionType(t: PartialDispersionType): void;
  toggleCatalog(name: CatalogName): void;
  enableCatalog(name: CatalogName): void;
  setSelectedGlass(glass: SelectedGlass | undefined): void;
  setGlassCatalogsResult(result: GlassCatalogsLoadResult): void;
}

export type GlassMapStore = GlassMapState & GlassMapActions;

const allEnabled = Object.fromEntries(
  CATALOG_NAMES.map((name) => [name, true])
) as Record<CatalogName, boolean>;

export interface GlassMapRouteIntent {
  readonly source: "medium-selector";
  readonly catalog: string;
  readonly glass: string;
}

export const createGlassMapSlice: StateCreator<GlassMapStore> = (set) => ({
  plotType: "refractiveIndex",
  abbeNumCenterLine: "d",
  partialDispersionType: "P_gF",
  enabledCatalogs: { ...allEnabled },
  selectedGlass: undefined,
  catalogsData: undefined,
  lookupMaps: undefined,
  catalogsError: undefined,
  catalogsLoaded: false,
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
  setGlassCatalogsResult: (result) =>
    set(
      result.error === undefined
        ? {
            catalogsData: result.data,
            lookupMaps: result.lookupMaps,
            catalogsError: undefined,
            catalogsLoaded: true,
          }
        : {
            catalogsData: undefined,
            lookupMaps: undefined,
            catalogsError: result.error,
            catalogsLoaded: false,
          }
    ),
});
