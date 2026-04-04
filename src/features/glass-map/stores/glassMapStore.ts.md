# `features/glass-map/stores/glassMapStore.ts`

## Purpose
Zustand store slice for the Glass Map page state.

## State (`GlassMapState`)
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `catalogsData` | `AllGlassCatalogsData \| undefined` | `undefined` | Loaded and normalized glass catalog data |
| `dataLoading` | `boolean` | `false` | True while fetching from worker |
| `dataError` | `string \| undefined` | `undefined` | Error message if loading fails |
| `plotType` | `GlassMapPlotType` | `'refractiveIndex'` | Which plot type to display |
| `abbeNumCenterLine` | `AbbeNumCenterLine` | `'d'` | d or e spectral line for Abbe number axis |
| `partialDispersionType` | `PartialDispersionType` | `'P_g_F'` | Which partial dispersion for y-axis |
| `enabledCatalogs` | `Record<CatalogName, boolean>` | all `true` | Per-catalog visibility filter |
| `selectedGlass` | `SelectedGlass \| undefined` | `undefined` | Currently clicked/selected glass |
| `pendingRouteIntent` | `GlassMapRouteIntent \| undefined` | `undefined` | One-time selection intent seeded by the page/provider and consumed when catalog data is committed |

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
| `setCatalogsData(data)` | Store loaded catalog data; if a valid pending route intent exists, also enables that catalog and selects the requested glass before clearing the pending intent |
| `setDataLoading(v)` | Set loading flag |
| `setDataError(e)` | Set/clear error string |
| `setRouteIntent(routeIntent)` | Apply or queue a route intent against the persistent store; if catalog data is already loaded, selection is restored immediately |
| `setPlotType(t)` | Switch between refractiveIndex / partialDispersion |
| `setAbbeNumCenterLine(l)` | Switch d/e spectral line |
| `setPartialDispersionType(t)` | Switch P_F_d / P_F_e / P_g_F |
| `toggleCatalog(name)` | Toggle a single catalog's enabled state |
| `enableCatalog(name)` | Force a single catalog to enabled=true without toggling others |
| `setSelectedGlass(glass)` | Set or clear the selected glass (callable from external components) |

## Export
- `createGlassMapSlice(initialRouteIntent?): StateCreator<GlassMapStore>` — use with `createStore<GlassMapStore>(createGlassMapSlice())` for the app-wide persistent store; `initialRouteIntent` remains optional for tests
- `GlassMapStore = GlassMapState & GlassMapActions`

## Usages

```tsx
"use client";

import { useStore } from "zustand";
import { createStore } from "createStore from "zustand";
import type { GlassMapStore } from "@/features/glass-map/stores/glassMapStore";
import { createGlassMapSlice } from "@/features/glass-map/stores/glassMapStore";
import { GlassScatterPlot } from "@/components/composite/GlassScatterPlot";

export default function GlassMapPage() {
  const { proxy, isReady } = usePyodide();

  // Create the store once
  const glassMapStore = useMemo(
    () => createStore<GlassMapStore>(createGlassMapSlice),
    []
  );

  // Read state
  const plotType = useStore(glassMapStore, (s) => s.plotType);
  const catalogsData = useStore(glassMapStore, (s) => s.catalogsData);
  const dataLoading = useStore(glassMapStore, (s) => s.dataLoading);

  // Load catalog data on mount
  useEffect(() => {
    if (!isReady || !proxy) return;

    glassMapStore.getState().setDataLoading(true);
    proxy
      .getAllGlassCatalogsData()
      .then((data) => {
        glassMapStore.getState().setCatalogsData(data);
      })
      .catch((err) => {
        glassMapStore.getState().setDataError(err.message);
      })
      .finally(() => {
        glassMapStore.getState().setDataLoading(false);
      });
  }, [isReady, proxy]);

  return (
    <div>
      {dataLoading && <p>Loading catalogs...</p>}
      {catalogsData && (
        <GlassScatterPlot
          data={catalogsData}
          plotType={plotType}
          onPlotTypeChange={(type) =>
            glassMapStore.getState().setPlotType(type)
          }
        />
      )}
    </div>
  );
}
```
