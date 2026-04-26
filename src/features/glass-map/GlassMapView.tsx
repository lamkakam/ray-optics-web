"use client";

import { useState } from "react";
import { useStore } from "zustand";
import { GlassScatterPlot } from "@/features/glass-map/components/GlassScatterPlot";
import { GlassMapControls } from "@/features/glass-map/components/GlassMapControls";
import { GlassDetailPanel } from "@/features/glass-map/components/GlassDetailPanel";
import type { GlassMapRouteIntent, GlassMapStore } from "@/features/glass-map/stores/glassMapStore";
import { useGlassMapStore } from "@/features/glass-map/providers/GlassMapStoreProvider";
import { InlineLink } from "@/shared/components/primitives/InlineLink";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import type { CatalogName, SelectedGlass } from "@/shared/lib/types/glassMap";
import { computePlotPoints } from "@/shared/lib/types/glassMap";
import { readGlassCatalogs } from "@/shared/lib/data/glassCatalogsResource";

interface GlassMapViewProps {
  readonly proxy: PyodideWorkerAPI | undefined;
  readonly isReady: boolean;
  readonly routeIntent?: GlassMapRouteIntent;
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
    P_F_d: "P_F,d",
    P_F_e: "P_F,e",
    P_g_F: "P_g,F",
  };
  return { xLabel, yLabel: yLabelMap[partialDispersionType] };
}

export function GlassMapView({ proxy, isReady, routeIntent }: GlassMapViewProps) {
  const store = useGlassMapStore();
  const plotType = useStore(store, (s) => s.plotType);
  const abbeNumCenterLine = useStore(store, (s) => s.abbeNumCenterLine);
  const partialDispersionType = useStore(store, (s) => s.partialDispersionType);
  const enabledCatalogs = useStore(store, (s) => s.enabledCatalogs);
  const selectedGlass = useStore(store, (s) => s.selectedGlass);
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

  const catalogsLoadResult = readGlassCatalogs(proxy);

  if (catalogsLoadResult.error !== undefined) {
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        {catalogsLoadResult.error}
      </div>
    );
  }

  const catalogsData = catalogsLoadResult.data;

  let routeSelectedGlass: SelectedGlass | undefined;
  if (routeIntent !== undefined) {
    const catalogName = routeIntent.catalog as CatalogName;
    const catalog = catalogsData[catalogName];
    const glassData = catalog?.[routeIntent.glass];

    if (glassData !== undefined) {
      routeSelectedGlass = {
        catalogName,
        glassName: routeIntent.glass,
        data: glassData,
      };
    }
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

  const handlePlotTypeChange = (value: GlassMapStore["plotType"]) => {
    setRouteIntentDismissed(true);
    setPlotType(value);
  };

  const handleAbbeNumCenterLineChange = (value: GlassMapStore["abbeNumCenterLine"]) => {
    setRouteIntentDismissed(true);
    setAbbeNumCenterLine(value);
  };

  const handlePartialDispersionTypeChange = (value: GlassMapStore["partialDispersionType"]) => {
    setRouteIntentDismissed(true);
    setPartialDispersionType(value);
  };

  const handleToggleCatalog = (name: CatalogName) => {
    setRouteIntentDismissed(true);
    toggleCatalog(name);
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
          <div className="px-4 pt-4">
            <InlineLink href="/" aria-label="Back to lens editor">
              Back to lens editor
            </InlineLink>
          </div>
        )}
        <GlassMapControls
          plotType={plotType}
          abbeNumCenterLine={abbeNumCenterLine}
          partialDispersionType={partialDispersionType}
          enabledCatalogs={effectiveEnabledCatalogs}
          onPlotTypeChange={handlePlotTypeChange}
          onAbbeNumCenterLineChange={handleAbbeNumCenterLineChange}
          onPartialDispersionTypeChange={handlePartialDispersionTypeChange}
          onToggleCatalog={handleToggleCatalog}
        />
        <GlassDetailPanel selectedGlass={effectiveSelectedGlass} />
      </div>
    </div>
  );
}
