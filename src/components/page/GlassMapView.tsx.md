# GlassMapView.tsx

## Purpose
Page-level container for the Glass Map feature. Fetches glass catalog data from the Pyodide worker, computes plot points, and orchestrates the three child components.

## Props
| Prop | Type | Description |
|------|------|-------------|
| `store` | `StoreApi<GlassMapStore>` | Zustand store instance (injected from parent) |
| `proxy` | `PyodideWorkerAPI \| undefined` | Worker proxy for data fetching |
| `isReady` | `boolean` | Whether the Pyodide worker is ready |

## Behavior
- Fetches data via `proxy.getAllGlassCatalogsData()` on mount when `isReady=true` and `catalogsData` is not yet set
- Normalizes raw data using `normalizeAllCatalogsData()`, stores in `GlassMapStore`
- Computes `PlotPoint[]` via `computePlotPoints()` (memoized)
- Derives axis labels from `plotType`, `abbeLine`, `partialDispersionType`

## Layout
- **Loading state** (`!isReady || dataLoading`): centered loading message
- **Error state** (`dataError`): centered red error message
- **Loaded**: `flex-col lg:flex-row h-full`
  - Left: flex-1 (lg: 60%) — `GlassScatterPlot`
  - Right: overflow-y-auto (lg: 40%) — `GlassMapControls` + `GlassDetailPanel`

## Axis Label Logic
| plotType | abbeLine | xLabel | yLabel |
|---|---|---|---|
| refractiveIndex | d | Vd | Nd |
| refractiveIndex | e | Ve | Ne |
| partialDispersion | d | Vd | P_F,d / P_F,e / P_g,F |
| partialDispersion | e | Ve | P_F,d / P_F,e / P_g,F |

## Children
- `GlassScatterPlot` — scatter plot with zoom/pan
- `GlassMapControls` — filter/selector controls
- `GlassDetailPanel` — selected glass details
