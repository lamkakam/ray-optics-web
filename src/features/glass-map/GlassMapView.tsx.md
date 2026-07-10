# GlassMapView.tsx

## Purpose
Page-level container for the Glass Map feature. Reads already-loaded glass catalog data from `GlassMapStore`, computes plot points, and orchestrates the three child components.

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
- Uses `catalogsData` and its derived `lookupMaps` from `GlassMapStore` as one rendering initialization unit
- Does not call the shared glass catalog resource loader; `app/AppShell.tsx` preloads the resource during app initialization and writes successful data into `GlassMapStore`
- Shows a minimal loading placeholder only if the route renders before `catalogsData` is available, which should be transient or impossible in normal app flow because AppShell blocks initialization until the preload succeeds
- Computes `PlotPoint[]` via `computePlotPoints()` from `features/glass-map/lib/glassMap`
- Derives axis labels from `plotType`, `abbeNumCenterLine`, `partialDispersionType`
- Treats `routeIntent` as a render-time override instead of synchronizing it into the store
- Passes the same lookup maps to route-intent resolution and `GlassMapCatalogSelector`
- If `routeIntent` resolves through the shared lookup-map-based catalog-glass resolver to a valid eligible glass, that glass is shown initially and its catalog is forced visible in the controls
- Plot radios and catalog checkboxes update their respective plot/filter state without dismissing the route-intent selection
- The route-intent override is dismissed when the user selects a chart point or commits the catalog selector, after which the persistent store selection is authoritative
- The catalog selector updates `selectedGlass` without changing `enabledCatalogs`; selecting from a disabled catalog updates details but leaves its plot points hidden
- When `routeIntent.source === "medium-selector"`, the back link is shown above the controls panel
- Renders a `Back to lens editor` inline link above the controls panel when opened from `MediumSelectorModal`
- Renders `Use selected glass` next to the back link only for medium-selector route intent when the selected glass is valid and the route supplied an apply callback
- Invokes `onUseSelectedGlass` with the effective selection (the route glass initially or a subsequently selected point) before the link navigates to `/`

## Layout
- **Loading state** (`!isReady || !proxy`, or missing `catalogsData`): centered loading message
- Catalog load failures are handled by `AppShell` through the blocking initialization overlay, not by this route view
- In normal app flow the missing-data placeholder is uncommon after the initial shell overlay because the shared shell preload has already populated the store
- **Loaded**: `flex-col lg:flex-row h-full`
  - Left: flex-1 (lg: 60%) — `GlassScatterPlot`
- Right: overflow-y-auto (lg: 40%) — `GlassMapCatalogSelector` + `GlassMapControls` + `GlassDetailPanel`
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
- `GlassMapCatalogSelector` — catalog dropdown, searchable glass datalist, and Select action
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
