# `features/glass-map/stores/glassMapStore.ts`

## Purpose
Zustand store slice for persistent Glass Map UI state and successfully loaded app-wide glass catalog lookup data.

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

```ts
interface GlassMapRouteIntent {
  source: "medium-selector";
  catalog: string;
  glass: string;
}
```

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

## Export
- `createGlassMapSlice: StateCreator<GlassMapStore>` — use with `createStore<GlassMapStore>(createGlassMapSlice)` for the app-wide persistent store
- `GlassMapStore = GlassMapState & GlassMapActions`
- `GlassMapRouteIntent` — route-level input type used by `app/glass-map/page.tsx` and `GlassMapView.tsx`, but not stored in zustand

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

## Loading Ownership
- `GlassMapStore` intentionally does not own catalog loading status or catalog loading errors.
- `app/AppShell.tsx` owns preload status/error, keeps the initialization overlay visible while initial loading is pending, and keeps it visible with the local error if loading fails.
- Only successful normalized catalog data is committed into this store through `setCatalogsData(data)`.
- Catalog data and lookup maps are committed together as one initialization unit; lookup construction is delegated to `buildGlassLookupMaps` in the glass-map runtime library.
