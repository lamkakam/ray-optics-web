import { type StateCreator } from "zustand";
import {
  CATALOG_NAMES,
  type AllGlassCatalogsData,
  type AbbeNumCenterLine,
  type CatalogName,
  type GlassMapPlotType,
  type PartialDispersionType,
  type SelectedGlass,
} from "@/lib/glassMap";

export interface GlassMapState {
  catalogsData: AllGlassCatalogsData | undefined;
  dataLoading: boolean;
  dataError: string | undefined;
  plotType: GlassMapPlotType;
  abbeNumCenterLine: AbbeNumCenterLine;
  partialDispersionType: PartialDispersionType;
  enabledCatalogs: Record<CatalogName, boolean>;
  selectedGlass: SelectedGlass | undefined;
}

export interface GlassMapActions {
  setCatalogsData(data: AllGlassCatalogsData): void;
  setDataLoading(v: boolean): void;
  setDataError(e: string | undefined): void;
  setPlotType(t: GlassMapPlotType): void;
  setAbbeNumCenterLine(l: AbbeNumCenterLine): void;
  setPartialDispersionType(t: PartialDispersionType): void;
  toggleCatalog(name: CatalogName): void;
  setSelectedGlass(glass: SelectedGlass | undefined): void;
}

export type GlassMapStore = GlassMapState & GlassMapActions;

const allEnabled = Object.fromEntries(
  CATALOG_NAMES.map((name) => [name, true])
) as Record<CatalogName, boolean>;

export const createGlassMapSlice: StateCreator<GlassMapStore> = (set) => ({
  catalogsData: undefined,
  dataLoading: false,
  dataError: undefined,
  plotType: 'refractiveIndex',
  abbeNumCenterLine: 'd',
  partialDispersionType: 'P_g_F',
  enabledCatalogs: { ...allEnabled },
  selectedGlass: undefined,

  setCatalogsData: (data) => set({ catalogsData: data }),
  setDataLoading: (v) => set({ dataLoading: v }),
  setDataError: (e) => set({ dataError: e }),
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
  setSelectedGlass: (glass) => set({ selectedGlass: glass }),
});
