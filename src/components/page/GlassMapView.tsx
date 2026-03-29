"use client";

import React, { useEffect, useMemo } from "react";
import { MathJaxContext } from "better-react-mathjax";
import { useStore } from "zustand";
import type { StoreApi } from "zustand";
import { GlassScatterPlot } from "@/components/composite/GlassScatterPlot";
import { GlassMapControls } from "@/components/composite/GlassMapControls";
import { GlassDetailPanel } from "@/components/composite/GlassDetailPanel";
import type { GlassMapStore } from "@/store/glassMapStore";
import type { PyodideWorkerAPI } from "@/hooks/usePyodide";
import type { SelectedGlass } from "@/lib/glassMap";
import { normalizeAllCatalogsData, computePlotPoints } from "@/lib/glassMap";

interface GlassMapViewProps {
  readonly store: StoreApi<GlassMapStore>;
  readonly proxy: PyodideWorkerAPI | undefined;
  readonly isReady: boolean;
}

function axisLabels(
  plotType: GlassMapStore["plotType"],
  abbeLine: GlassMapStore["abbeLine"],
  partialDispersionType: GlassMapStore["partialDispersionType"]
): { xLabel: string; yLabel: string } {
  const xLabel = abbeLine === "d" ? "Vd" : "Ve";
  if (plotType === "refractiveIndex") {
    return { xLabel, yLabel: abbeLine === "d" ? "Nd" : "Ne" };
  }
  const yLabelMap: Record<GlassMapStore["partialDispersionType"], string> = {
    P_F_d: "P_F,d",
    P_F_e: "P_F,e",
    P_g_F: "P_g,F",
  };
  return { xLabel, yLabel: yLabelMap[partialDispersionType] };
}

export function GlassMapView({ store, proxy, isReady }: GlassMapViewProps) {
  const catalogsData = useStore(store, (s) => s.catalogsData);
  const dataLoading = useStore(store, (s) => s.dataLoading);
  const dataError = useStore(store, (s) => s.dataError);
  const plotType = useStore(store, (s) => s.plotType);
  const abbeLine = useStore(store, (s) => s.abbeLine);
  const partialDispersionType = useStore(store, (s) => s.partialDispersionType);
  const enabledCatalogs = useStore(store, (s) => s.enabledCatalogs);
  const selectedGlass = useStore(store, (s) => s.selectedGlass);

  const {
    setCatalogsData,
    setDataLoading,
    setDataError,
    setPlotType,
    setAbbeLine,
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
        ? computePlotPoints(catalogsData, enabledCatalogs, plotType, abbeLine, partialDispersionType)
        : [],
    [catalogsData, enabledCatalogs, plotType, abbeLine, partialDispersionType]
  );

  const { xLabel, yLabel } = axisLabels(plotType, abbeLine, partialDispersionType);

  const handlePointClick = (glass: SelectedGlass) => {
    setSelectedGlass(glass);
  };

  if (!isReady || dataLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        Loading glass catalog data…
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        {dataError}
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
      <MathJaxContext>
        <div className="lg:w-[40%] overflow-y-auto border-l border-gray-200 dark:border-gray-700 flex flex-col">
          <GlassMapControls
            plotType={plotType}
            abbeLine={abbeLine}
            partialDispersionType={partialDispersionType}
            enabledCatalogs={enabledCatalogs}
            onPlotTypeChange={setPlotType}
            onAbbeLineChange={setAbbeLine}
            onPartialDispersionTypeChange={setPartialDispersionType}
            onToggleCatalog={toggleCatalog}
          />
          <GlassDetailPanel selectedGlass={selectedGlass} />
        </div>
      </MathJaxContext>
    </div>
  );
}
