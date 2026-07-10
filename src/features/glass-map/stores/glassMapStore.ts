import { type StateCreator } from "zustand";
import {
  CATALOG_NAMES,
  type AbbeNumCenterLine,
  type AllGlassCatalogsData,
  type CompleteGlassCatalogsData,
  type CatalogName,
  type GlassLookupMaps,
  type GlassMapPlotType,
  type PartialDispersionType,
  type SelectedGlass,
  type UserDefinedMaterialsData,
} from "@/features/glass-map/types/glassMap";
import { buildGlassLookupMaps, completeAllCatalogsData } from "@/features/glass-map/lib/glassMap";

export interface GlassMapState {
  plotType: GlassMapPlotType;
  abbeNumCenterLine: AbbeNumCenterLine;
  partialDispersionType: PartialDispersionType;
  enabledCatalogs: Record<CatalogName, boolean>;
  selectedGlass: SelectedGlass | undefined;
  catalogsData: CompleteGlassCatalogsData | undefined;
  lookupMaps: GlassLookupMaps | undefined;
}

export interface GlassMapActions {
  setPlotType(t: GlassMapPlotType): void;
  setAbbeNumCenterLine(l: AbbeNumCenterLine): void;
  setPartialDispersionType(t: PartialDispersionType): void;
  toggleCatalog(name: CatalogName): void;
  enableCatalog(name: CatalogName): void;
  setSelectedGlass(glass: SelectedGlass | undefined): void;
  setCatalogsData(data: AllGlassCatalogsData): void;
  upsertCustomGlasses(materialsData: UserDefinedMaterialsData): void;
  deleteCustomGlasses(labels: readonly string[]): void;
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
  setCatalogsData: (data) => {
    const catalogsData = completeAllCatalogsData(data);
    set({
      catalogsData,
      lookupMaps: buildGlassLookupMaps(catalogsData),
    });
  },
  upsertCustomGlasses: (materialsData) =>
    set((state) => {
      if (state.catalogsData === undefined) {
        return {};
      }

      const catalogsData = {
        ...state.catalogsData,
        Custom: {
          ...(state.catalogsData.Custom ?? {}),
          ...materialsData,
        },
      };

      return {
        catalogsData,
        lookupMaps: buildGlassLookupMaps(catalogsData),
      };
    }),
  deleteCustomGlasses: (labels) =>
    set((state) => {
      if (state.catalogsData === undefined) {
        return {};
      }

      const deleted = new Set(labels);
      const nextCustom = { ...(state.catalogsData.Custom ?? {}) };
      for (const label of labels) {
        delete nextCustom[label];
      }
      const catalogsData = {
        ...state.catalogsData,
        Custom: nextCustom,
      };
      const selectedGlass = state.selectedGlass?.catalogName === "Custom"
        && deleted.has(state.selectedGlass.glassName)
        ? undefined
        : state.selectedGlass;

      return {
        catalogsData,
        lookupMaps: buildGlassLookupMaps(catalogsData),
        selectedGlass,
      };
    }),
});
