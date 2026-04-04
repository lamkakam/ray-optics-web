# GlassMapView.tsx

## Purpose
Page-level container for the Glass Map feature. Reads glass catalog data through a Suspense resource, computes plot points, and orchestrates the three child components.

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
- Obtains the `GlassMapStore` via `useGlassMapStore()` (provided by `GlassMapStoreProvider` in `app/glass-map/page.tsx`)
- Returns a loading placeholder until `isReady=true` and `proxy` is available
- Reads normalized catalog data via `readGlassCatalogs(proxy)`; loading is handled by Suspense and deduplicated per worker proxy
- Computes `PlotPoint[]` via `computePlotPoints()`
- Derives axis labels from `plotType`, `abbeNumCenterLine`, `partialDispersionType`
- Treats `routeIntent` as a render-time override instead of synchronizing it into the store
- If `routeIntent` resolves to a valid glass, that glass is shown initially and its catalog is forced visible in the controls
- The route-intent override is dismissed after user interaction with the plot controls or plot selection, after which the persistent store state is authoritative again
- When `routeIntent.source === "medium-selector"`, the back link is shown above the controls panel
- Renders a `Back to lens editor` inline link above the controls panel when opened from `MediumSelectorModal`

## Layout
- **Error state** (`readGlassCatalogs(proxy).error`): centered red error message
- **Loading state** (`!isReady || !proxy` in this component, or Suspense fallback while the resource promise is pending): centered loading message
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
