# GlassMapView.tsx

## Purpose
Page-level container for the Glass Map feature. Fetches glass catalog data from the Pyodide worker, computes plot points, and orchestrates the three child components.

## Props
| Prop | Type | Description |
|------|------|-------------|
| `proxy` | `PyodideWorkerAPI \| undefined` | Worker proxy for data fetching |
| `isReady` | `boolean` | Whether the Pyodide worker is ready |
| `routeIntent` | `GlassMapRouteIntent \| undefined` | Optional route-level selection intent from another page |

```ts
interface GlassMapRouteIntent {
  source: "medium-selector";
  catalog: string;
  glass: string;
}
```

## Behavior
- Obtains the `GlassMapStore` via `useGlassMapStore()` (provided by `GlassMapStoreProvider` in `layout.tsx`)
- Fetches data via `proxy.getAllGlassCatalogsData()` on mount when `isReady=true` and `catalogsData` is not yet set
- Normalizes raw data using `normalizeAllCatalogsData()`, stores in `GlassMapStore`
- Computes `PlotPoint[]` via `computePlotPoints()` (memoized)
- Derives axis labels from `plotType`, `abbeNumCenterLine`, `partialDispersionType`
- When `routeIntent.source === "medium-selector"` and the requested catalog/glass exists after data load, forces that catalog visible and restores it as `selectedGlass`
- If the requested catalog or glass is missing, the current selection is left unchanged
- Renders a `Back to lens editor` inline link above the controls panel when opened from `MediumSelectorModal`

## Layout
- **Error state** (`dataError`): centered red error message (checked first, so a fetch failure always surfaces even when `catalogsData` is still `undefined`)
- **Loading state** (`!isReady || dataLoading || catalogsData === undefined`): centered loading message
- **Loaded**: `flex-col lg:flex-row h-full`
  - Left: flex-1 (lg: 60%) — `GlassScatterPlot`
- Right: overflow-y-auto (lg: 40%) — `GlassMapControls` + `GlassDetailPanel`
  - When present, the back link is rendered above `GlassMapControls`

## Axis Label Logic
| plotType | abbeNumCenterLine | xLabel | yLabel |
|---|---|---|---|
| refractiveIndex | d | Vd | Nd |
| refractiveIndex | e | Ve | Ne |
| partialDispersion | d | Vd | P_F,d / P_F,e / P_g,F |
| partialDispersion | e | Ve | P_F,d / P_F,e / P_g,F |

## MathJax
MathJax context is provided by `app/AppShell.tsx`. This component does not own a `MathJaxContext`.

## Children
- `GlassScatterPlot` — scatter plot with zoom/pan
- `GlassMapControls` — filter/selector controls (uses MathJax from parent context)
- `GlassDetailPanel` — selected glass details (uses MathJax from parent context)

## Usages

`GlassMapStoreProvider` is mounted in `app/layout.tsx`:
```tsx
<LensLayoutImageStoreProvider>
  <GlassMapStoreProvider>
    {children}
  </GlassMapStoreProvider>
</LensLayoutImageStoreProvider>
```

In `app/glass-map/page.tsx`:
```tsx
<GlassMapView proxy={proxy} isReady={isReady} />
```

In tests — inject store via context:
```tsx
render(
  <GlassMapStoreContext.Provider value={store}>
    <GlassMapView proxy={proxy} isReady={isReady} />
  </GlassMapStoreContext.Provider>
);
```
