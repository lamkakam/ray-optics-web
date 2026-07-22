/**
# GlassMapView.tsx

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
*/
"use client";

import { useState } from "react";
import { useStore } from "zustand";
import {
  GlassScatterPlot,
  GlassMapControls,
  GlassDetailPanel,
  GlassMapCatalogSelector,
} from "./components";
import type { GlassMapRouteIntent, GlassMapStore } from "./stores/glassMapStore";
import { useGlassMapStore } from "./providers/GlassMapStoreProvider";
import { InlineLink } from "@/shared/components/primitives/InlineLink";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import type { SelectedGlass } from "./types/glassMap";
import { computePlotPoints, resolveCatalogGlass } from "./lib/glassMap";

interface GlassMapViewProps {
  /** Worker proxy for data fetching */
  readonly proxy: PyodideWorkerAPI | undefined;
  /** Whether the Pyodide worker is ready */
  readonly isReady: boolean;
  /** Optional route-level selection intent from another page */
  readonly routeIntent?: GlassMapRouteIntent;
  /** Optional decoupled action for applying the effective selection to the originating workflow */
  readonly onUseSelectedGlass?: (glass: SelectedGlass) => void;
}

function axisLabels(
  plotType: GlassMapStore["plotType"],
  abbeNumCenterLine: GlassMapStore["abbeNumCenterLine"],
  partialDispersionType: GlassMapStore["partialDispersionType"]
): { xLabel: string; yLabel: string } {
  const xLabel = abbeNumCenterLine === "d" ? "Vd" : "Ve";
  if (plotType === "refractiveIndex") {
    return { xLabel, yLabel: abbeNumCenterLine === "d" ? "Nd" : "Ne" };
  }
  const yLabelMap: Record<GlassMapStore["partialDispersionType"], string> = {
    P_Fd: "P_F,d",
    P_fe: "P_F,e",
    P_gF: "P_g,F",
  };
  return { xLabel, yLabel: yLabelMap[partialDispersionType] };
}

/**
## Purpose
Page-level container for the Glass Map feature. Reads already-loaded glass catalog data from `GlassMapStore`, computes plot points, and orchestrates the three child components.

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
*/
export function GlassMapView({ proxy, isReady, routeIntent, onUseSelectedGlass }: GlassMapViewProps) {
  const store = useGlassMapStore();
  const plotType = useStore(store, (s) => s.plotType);
  const abbeNumCenterLine = useStore(store, (s) => s.abbeNumCenterLine);
  const partialDispersionType = useStore(store, (s) => s.partialDispersionType);
  const enabledCatalogs = useStore(store, (s) => s.enabledCatalogs);
  const selectedGlass = useStore(store, (s) => s.selectedGlass);
  const catalogsData = useStore(store, (s) => s.catalogsData);
  const lookupMaps = useStore(store, (s) => s.lookupMaps);
  const [routeIntentDismissed, setRouteIntentDismissed] = useState(false);

  const {
    setPlotType,
    setAbbeNumCenterLine,
    setPartialDispersionType,
    toggleCatalog,
    setSelectedGlass,
  } = store.getState();

  if (!isReady || !proxy) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        Loading glass catalog data…
      </div>
    );
  }

  if (catalogsData === undefined || lookupMaps === undefined) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        Loading glass catalog data…
      </div>
    );
  }

  let routeSelectedGlass: SelectedGlass | undefined;
  if (routeIntent !== undefined) {
    routeSelectedGlass = resolveCatalogGlass(catalogsData, lookupMaps, routeIntent.catalog, routeIntent.glass);
  }

  const routeIntentActive = !routeIntentDismissed && routeSelectedGlass !== undefined;
  const effectiveSelectedGlass = routeIntentActive ? routeSelectedGlass : selectedGlass;
  const effectiveEnabledCatalogs =
    !routeIntentActive || routeSelectedGlass === undefined
      ? enabledCatalogs
      : {
          ...enabledCatalogs,
          [routeSelectedGlass.catalogName]: true,
        };

  const points = computePlotPoints(
    catalogsData,
    effectiveEnabledCatalogs,
    plotType,
    abbeNumCenterLine,
    partialDispersionType
  );

  const { xLabel, yLabel } = axisLabels(plotType, abbeNumCenterLine, partialDispersionType);

  const handlePointClick = (glass: SelectedGlass) => {
    setRouteIntentDismissed(true);
    setSelectedGlass(glass);
  };

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-hidden">
      {/* Plot area */}
      <div className="flex-1 lg:w-[60%] min-h-[300px]">
        <GlassScatterPlot
          points={points}
          selectedGlass={effectiveSelectedGlass}
          xAxisLabel={xLabel}
          yAxisLabel={yLabel}
          onPointClick={handlePointClick}
          yDomainMin={plotType === "refractiveIndex" ? 1.4 : undefined}
          yDomainMax={plotType === "refractiveIndex" ? 2.0 : undefined}
        />
      </div>
      {/* Controls + detail */}
      <div className="lg:w-[40%] overflow-y-auto border-l border-gray-200 dark:border-gray-700 flex flex-col">
        {routeIntent?.source === "medium-selector" && (
          <div className="flex gap-4 px-4 pt-4">
            <InlineLink href="/" aria-label="Back to lens editor">
              Back to lens editor
            </InlineLink>
            {effectiveSelectedGlass !== undefined && onUseSelectedGlass !== undefined && (
              <InlineLink
                href="/"
                aria-label="Use selected glass"
                onClick={() => onUseSelectedGlass(effectiveSelectedGlass)}
              >
                Use selected glass
              </InlineLink>
            )}
          </div>
        )}
        <GlassMapCatalogSelector catalogsData={catalogsData} lookupMaps={lookupMaps} onSelect={handlePointClick} />
        <GlassMapControls
          plotType={plotType}
          abbeNumCenterLine={abbeNumCenterLine}
          partialDispersionType={partialDispersionType}
          enabledCatalogs={effectiveEnabledCatalogs}
          onPlotTypeChange={setPlotType}
          onAbbeNumCenterLineChange={setAbbeNumCenterLine}
          onPartialDispersionTypeChange={setPartialDispersionType}
          onToggleCatalog={toggleCatalog}
        />
        <GlassDetailPanel selectedGlass={effectiveSelectedGlass} />
      </div>
    </div>
  );
}
