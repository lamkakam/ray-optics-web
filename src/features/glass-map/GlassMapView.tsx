"use client";

import React, { useEffect, useMemo } from "react";
import { useStore } from "zustand";
import { GlassScatterPlot } from "@/features/glass-map/components/GlassScatterPlot";
import { GlassMapControls } from "@/features/glass-map/components/GlassMapControls";
import { GlassDetailPanel } from "@/features/glass-map/components/GlassDetailPanel";
import type { GlassMapRouteIntent, GlassMapStore } from "@/features/glass-map/stores/glassMapStore";
import { useGlassMapStore } from "@/features/glass-map/providers/GlassMapStoreProvider";
import { InlineLink } from "@/shared/components/primitives/InlineLink";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import type { SelectedGlass } from "@/shared/lib/types/glassMap";
import { normalizeAllCatalogsData, computePlotPoints } from "@/shared/lib/types/glassMap";

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
  const catalogsData = useStore(store, (s) => s.catalogsData);
  const dataLoading = useStore(store, (s) => s.dataLoading);
  const dataError = useStore(store, (s) => s.dataError);
  const plotType = useStore(store, (s) => s.plotType);
  const abbeNumCenterLine = useStore(store, (s) => s.abbeNumCenterLine);
  const partialDispersionType = useStore(store, (s) => s.partialDispersionType);
  const enabledCatalogs = useStore(store, (s) => s.enabledCatalogs);
  const selectedGlass = useStore(store, (s) => s.selectedGlass);

  const {
    setCatalogsData,
    setDataLoading,
    setDataError,
    setPlotType,
    setAbbeNumCenterLine,
    setPartialDispersionType,
    toggleCatalog,
    setSelectedGlass,
  } = store.getState();

  // Fetch data on mount when ready and not yet loaded
  useEffect(() => {
    if (!isReady || !proxy || catalogsData !== undefined) return;
    setDataLoading(true);
    proxy
      .getAllGlassCatalogsData()
      .then((raw) => {
        setCatalogsData(normalizeAllCatalogsData(raw));
        setDataLoading(false);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Failed to load glass data";
        setDataError(message);
        setDataLoading(false);
      });
  }, [isReady, proxy, catalogsData, setCatalogsData, setDataLoading, setDataError]);

  const points = useMemo(
    () =>
      catalogsData
        ? computePlotPoints(catalogsData, enabledCatalogs, plotType, abbeNumCenterLine, partialDispersionType)
        : [],
    [catalogsData, enabledCatalogs, plotType, abbeNumCenterLine, partialDispersionType]
  );

  const { xLabel, yLabel } = axisLabels(plotType, abbeNumCenterLine, partialDispersionType);

  const handlePointClick = (glass: SelectedGlass) => {
    setSelectedGlass(glass);
  };

  if (dataError) {
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        {dataError}
      </div>
    );
  }

  if (!isReady || dataLoading || catalogsData === undefined) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        Loading glass catalog data…
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-hidden">
      {/* Plot area */}
      <div className="flex-1 lg:w-[60%] min-h-[300px]">
        <GlassScatterPlot
          points={points}
          selectedGlass={selectedGlass}
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
          enabledCatalogs={enabledCatalogs}
          onPlotTypeChange={setPlotType}
          onAbbeNumCenterLineChange={setAbbeNumCenterLine}
          onPartialDispersionTypeChange={setPartialDispersionType}
          onToggleCatalog={toggleCatalog}
        />
        <GlassDetailPanel selectedGlass={selectedGlass} />
      </div>
    </div>
  );
}
