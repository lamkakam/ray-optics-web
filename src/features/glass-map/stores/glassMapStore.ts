/**
# `features/glass-map/stores/glassMapStore.ts`

## State (`GlassMapState`)
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `plotType` | `GlassMapPlotType` | `'refractiveIndex'` | Which plot type to display |
| `abbeNumCenterLine` | `AbbeNumCenterLine` | `'d'` | d or e spectral line for Abbe number axis |
| `partialDispersionType` | `PartialDispersionType` | `'P_gF'` | Which partial dispersion for y-axis |
| `enabledCatalogs` | `Record<CatalogName, boolean>` | all `true` | Per-catalog visibility filter |
| `selectedGlass` | `SelectedGlass \| undefined` | `undefined` | Currently clicked/selected glass |
| `catalogsData` | `CompleteGlassCatalogsData \| undefined` | `undefined` | Normalized loaded glass catalog data shared across the app, including `Custom` |
| `lookupMaps` | `GlassLookupMaps \| undefined` | `undefined` | Lookup maps built by the glass-map runtime library from the same normalized catalog data |

## Actions (`GlassMapActions`)
| Action | Description |
|--------|-------------|
| `setPlotType(t)` | Switch between refractiveIndex / partialDispersion |
| `setAbbeNumCenterLine(l)` | Switch d/e spectral line |
| `setPartialDispersionType(t)` | Switch P_Fd / P_fe / P_gF |
| `toggleCatalog(name)` | Toggle a single catalog's enabled state |
| `enableCatalog(name)` | Force a single catalog to enabled=true without toggling others |
| `setSelectedGlass(glass)` | Set or clear the selected glass (callable from external components) |
| `setCatalogsData(data)` | Replace normalized catalog data and rebuild lookup maps from it |
| `upsertCustomGlasses(materialsData)` | Merge worker-returned user-defined glass data into `catalogsData.Custom` and rebuild lookup maps |
| `deleteCustomGlasses(labels)` | Remove labels from `catalogsData.Custom`, rebuild lookup maps, and clear `selectedGlass` when its Custom entry was deleted |

## Loading Ownership
- `GlassMapStore` intentionally does not own catalog loading status or catalog loading errors.
- `app/AppShell.tsx` owns preload status/error, keeps the initialization overlay visible while initial loading is pending, and keeps it visible with the local error if loading fails.
- Only successful normalized catalog data is committed into this store through `setCatalogsData(data)`.
- Catalog data and lookup maps are committed together as one initialization unit; lookup construction is delegated to `buildGlassLookupMaps` in the glass-map runtime library.
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

/**
## Purpose
Zustand store slice for persistent Glass Map UI state and successfully loaded app-wide glass catalog lookup data.

## Usages

```tsx
"use client";

import { useStore } from "zustand";
import { createStore } from "zustand";
import type { GlassMapStore } from "@/features/glass-map/stores/glassMapStore";
import { createGlassMapSlice } from "@/features/glass-map/stores/glassMapStore";
import { GlassScatterPlot } from "@/features/glass-map/components/GlassScatterPlot";

export default function GlassMapView({ proxy }: { proxy: PyodideWorkerAPI }) {
  const glassMapStore = createStore<GlassMapStore>(createGlassMapSlice);

  const plotType = useStore(glassMapStore, (s) => s.plotType);
  const catalogsData = useStore(glassMapStore, (s) => s.catalogsData);

  if (catalogsData === undefined) {
    return <p>Loading glass catalog data...</p>;
  }

  return (
    <GlassScatterPlot
      points={[]}
      selectedGlass={undefined}
      xAxisLabel="Vd"
      yAxisLabel="Nd"
      onPointClick={() => undefined}
    />
  );
}
```
*/
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
