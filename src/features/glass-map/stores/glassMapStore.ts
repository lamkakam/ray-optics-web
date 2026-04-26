import { type StateCreator } from "zustand";
import {
  CATALOG_NAMES,
  type AbbeNumCenterLine,
  type CatalogName,
  type GlassMapPlotType,
  type PartialDispersionType,
  type SelectedGlass,
} from "@/features/glass-map/types/glassMap";

export interface GlassMapState {
  plotType: GlassMapPlotType;
  abbeNumCenterLine: AbbeNumCenterLine;
  partialDispersionType: PartialDispersionType;
  enabledCatalogs: Record<CatalogName, boolean>;
  selectedGlass: SelectedGlass | undefined;
}

export interface GlassMapActions {
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

export interface GlassMapRouteIntent {
  readonly source: "medium-selector";
  readonly catalog: string;
  readonly glass: string;
}

export const createGlassMapSlice: StateCreator<GlassMapStore> = (set) => ({
    plotType: 'refractiveIndex',
    abbeNumCenterLine: 'd',
    partialDispersionType: 'P_g_F',
    enabledCatalogs: { ...allEnabled },
    selectedGlass: undefined,
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
