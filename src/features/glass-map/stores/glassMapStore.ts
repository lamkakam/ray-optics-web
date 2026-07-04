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

export interface GlassMapState {
  plotType: GlassMapPlotType;
  abbeNumCenterLine: AbbeNumCenterLine;
  partialDispersionType: PartialDispersionType;
  enabledCatalogs: Record<CatalogName, boolean>;
  selectedGlass: SelectedGlass | undefined;
  catalogsData: AllGlassCatalogsData | undefined;
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
}

export type GlassMapStore = GlassMapState & GlassMapActions;

const allEnabled = Object.fromEntries(
  CATALOG_NAMES.map((name) => [name, true])
) as Record<CatalogName, boolean>;

const BUILT_IN_SPECIAL_MEDIA = ["CaF2", "Fused silica", "Water"] as const;
const CAF2_ALIASES = ["fluorite", "fluorspar"] as const;

function normalizeLookupKey(value: string): string {
  return value.trim().toLowerCase();
}

export function _buildGlassLookupMaps(catalogsData: AllGlassCatalogsData): GlassLookupMaps {
  const manufacturerMap = new Map<string, CatalogName>();
  const mediumMap = new Map<string, { medium: string; manufacturer: string }>();

  for (const catalogName of CATALOG_NAMES) {
    manufacturerMap.set(normalizeLookupKey(catalogName), catalogName);

    for (const glassName of Object.keys(catalogsData[catalogName])) {
      if (catalogName === "Special") {
        if (glassName !== "REFL") {
          mediumMap.set(normalizeLookupKey(glassName), { medium: glassName, manufacturer: "" });
        }
        continue;
      }

      mediumMap.set(`${normalizeLookupKey(catalogName)}:${normalizeLookupKey(glassName)}`, {
        medium: glassName,
        manufacturer: catalogName,
      });
    }
  }

  for (const medium of BUILT_IN_SPECIAL_MEDIA) {
    mediumMap.set(normalizeLookupKey(medium), { medium, manufacturer: "" });
  }

  for (const alias of CAF2_ALIASES) {
    mediumMap.set(normalizeLookupKey(alias), { medium: "CaF2", manufacturer: "" });
  }

  return { manufacturerMap, mediumMap };
}

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
  setCatalogsData: (data) =>
    set({
      catalogsData: data,
      lookupMaps: _buildGlassLookupMaps(data),
    }),
});
