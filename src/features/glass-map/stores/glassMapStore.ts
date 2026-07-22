/**
 * Describes the Glass Map Store module.
 *
 * @remarks
 * ## Loading Ownership
 * - `GlassMapStore` intentionally does not own catalog loading status or catalog loading errors.
 * - `app/AppShell.tsx` owns preload status/error, keeps the initialization overlay visible while initial loading is pending, and keeps it visible with the local error if loading fails.
 * - Only successful normalized catalog data is committed into this store through `setCatalogsData(data)`.
 * - Catalog data and lookup maps are committed together as one initialization unit; lookup construction is delegated to `buildGlassLookupMaps` in the glass-map runtime library.
 */
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
  /** Plot shown by the Glass Map. Defaults to `"refractiveIndex"`. */
  plotType: GlassMapPlotType;
  /** Spectral line used for the Abbe-number axis. Defaults to `"d"`. */
  abbeNumCenterLine: AbbeNumCenterLine;
  /** Partial-dispersion measure used for the y-axis. Defaults to `"P_gF"`. */
  partialDispersionType: PartialDispersionType;
  /** Per-catalog visibility flags. Every catalog is enabled by default. */
  enabledCatalogs: Record<CatalogName, boolean>;
  /** Currently selected glass, or `undefined` when no glass is selected. */
  selectedGlass: SelectedGlass | undefined;
  /** Normalized app-wide catalog data, including `Custom`, or `undefined` until loading succeeds. */
  catalogsData: CompleteGlassCatalogsData | undefined;
  /** Lookup maps built from `catalogsData`, or `undefined` until catalog loading succeeds. */
  lookupMaps: GlassLookupMaps | undefined;
}

export interface GlassMapActions {
  /** Selects the refractive-index or partial-dispersion plot. */
  setPlotType(t: GlassMapPlotType): void;
  /** Selects the `d` or `e` spectral line for the Abbe-number axis. */
  setAbbeNumCenterLine(l: AbbeNumCenterLine): void;
  /** Selects the partial-dispersion measure used for the y-axis. */
  setPartialDispersionType(t: PartialDispersionType): void;
  /** Toggles one catalog's enabled state without changing other catalogs. */
  toggleCatalog(name: CatalogName): void;
  /** Enables one catalog without changing other catalogs. */
  enableCatalog(name: CatalogName): void;
  /** Sets or clears the externally accessible selected glass. */
  setSelectedGlass(glass: SelectedGlass | undefined): void;
  /** Normalizes replacement catalog data and atomically rebuilds its lookup maps. */
  setCatalogsData(data: AllGlassCatalogsData): void;
  /** Merges worker-returned user-defined glasses into `catalogsData.Custom` and rebuilds lookup maps. Does nothing before catalog data is loaded. */
  upsertCustomGlasses(materialsData: UserDefinedMaterialsData): void;
  /** Removes labels from `catalogsData.Custom`, rebuilds lookup maps, and clears `selectedGlass` if its Custom entry was removed. Does nothing before catalog data is loaded. */
  deleteCustomGlasses(labels: readonly string[]): void;
}

/** Zustand store slice for persistent Glass Map UI state and successfully loaded app-wide glass catalog lookup data. */
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
