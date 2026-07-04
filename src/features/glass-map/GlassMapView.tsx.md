# GlassMapView.tsx

## Purpose
Page-level container for the Glass Map feature. Reads glass catalog data from `GlassMapStore`, starts the shared Suspense resource only when the store has not been populated yet, computes plot points, and orchestrates the three child components.

## Props
| Prop | Type | Description |
|------|------|-------------|
| `proxy` | `PyodideWorkerAPI \| undefined` | Worker proxy for data fetching |
| `isReady` | `boolean` | Whether the Pyodide worker is ready |
| `routeIntent` | `GlassMapRouteIntent \| undefined` | Optional route-level selection intent from another page |
| `onUseSelectedGlass` | `((glass: SelectedGlass) => void) \| undefined` | Optional decoupled action for applying the effective selection to the originating workflow |

```ts
interface GlassMapRouteIntent {
  source: "medium-selector";
  catalog: string;
  glass: string;
}
```

## Behavior
- Obtains the `GlassMapStore` via `useGlassMapStore()` (provided by `GlassMapStoreProvider` in `app/glass-map/page.tsx`)
- Returns a loading placeholder until `isReady=true` and `proxy` is available
- Uses `catalogsData` / `catalogsError` from `GlassMapStore` as the rendering source of truth
- If the store has neither loaded catalog data nor an error, calls the shared `readGlassCatalogs(proxy)` loader to start or suspend loading, then commits the resolved result back to the store with `setGlassCatalogsResult()`
- Usually receives already-populated store data because `app/AppShell.tsx` preloads the same resource during app initialization and writes the result into `GlassMapStore`
- Computes `PlotPoint[]` via `computePlotPoints()` from `features/glass-map/lib/glassMap`
- Derives axis labels from `plotType`, `abbeNumCenterLine`, `partialDispersionType`
- Treats `routeIntent` as a render-time override instead of synchronizing it into the store
- If `routeIntent` resolves to a valid glass, that glass is shown initially and its catalog is forced visible in the controls
- Plot radios and catalog checkboxes update their respective plot/filter state without dismissing the route-intent selection
- The route-intent override is dismissed only when the user selects a chart point, after which that point and the persistent store state are authoritative
- When `routeIntent.source === "medium-selector"`, the back link is shown above the controls panel
- Renders a `Back to lens editor` inline link above the controls panel when opened from `MediumSelectorModal`
- Renders `Use selected glass` next to the back link only for medium-selector route intent when the selected glass is valid and the route supplied an apply callback
- Invokes `onUseSelectedGlass` with the effective selection (the route glass initially or a subsequently selected point) before the link navigates to `/`

## Layout
- **Error state** (`GlassMapStore.catalogsError`, or a just-read resource error before the store effect commits): centered red error message
- **Loading state** (`!isReady || !proxy` in this component, or Suspense fallback while the resource promise is pending): centered loading message
- In normal app flow the Suspense fallback is uncommon after the initial shell overlay because the shared shell preload has already populated the store
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

In `app/glass-map/page.tsx`:
```tsx
<GlassMapView
  key={routeIntentKey}
  proxy={proxy}
  isReady={isReady}
  routeIntent={routeIntent}
/>
```

In tests — inject store via context:
```tsx
render(
  <GlassMapStoreContext.Provider value={store}>
    <Suspense fallback={<div>Loading glass catalog data…</div>}>
      <GlassMapView proxy={proxy} isReady={isReady} />
    </Suspense>
  </GlassMapStoreContext.Provider>
);
```
