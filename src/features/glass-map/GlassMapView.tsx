"use client";

import { useEffect, useState } from "react";
import { useStore } from "zustand";
import {
  GlassScatterPlot,
  GlassMapControls,
  GlassDetailPanel,
} from "./components";
import type { GlassMapRouteIntent, GlassMapStore } from "./stores/glassMapStore";
import { useGlassMapStore } from "./providers/GlassMapStoreProvider";
import { InlineLink } from "@/shared/components/primitives/InlineLink";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import type { CatalogName, SelectedGlass } from "./types/glassMap";
import { computePlotPoints } from "./lib/glassMap";
import { readGlassCatalogs } from "./lib/glassCatalogsResource";

interface GlassMapViewProps {
  readonly proxy: PyodideWorkerAPI | undefined;
  readonly isReady: boolean;
  readonly routeIntent?: GlassMapRouteIntent;
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

export function GlassMapView({ proxy, isReady, routeIntent, onUseSelectedGlass }: GlassMapViewProps) {
  const store = useGlassMapStore();
  const plotType = useStore(store, (s) => s.plotType);
  const abbeNumCenterLine = useStore(store, (s) => s.abbeNumCenterLine);
  const partialDispersionType = useStore(store, (s) => s.partialDispersionType);
  const enabledCatalogs = useStore(store, (s) => s.enabledCatalogs);
  const selectedGlass = useStore(store, (s) => s.selectedGlass);
  const storedCatalogsData = useStore(store, (s) => s.catalogsData);
  const storedCatalogsError = useStore(store, (s) => s.catalogsError);
  const [routeIntentDismissed, setRouteIntentDismissed] = useState(false);

  const {
    setPlotType,
    setAbbeNumCenterLine,
    setPartialDispersionType,
    toggleCatalog,
    setSelectedGlass,
    setGlassCatalogsResult,
  } = store.getState();

  const catalogsLoadResult =
    isReady && proxy !== undefined && storedCatalogsData === undefined && storedCatalogsError === undefined
      ? readGlassCatalogs(proxy)
      : undefined;

  useEffect(() => {
    if (catalogsLoadResult !== undefined) {
      setGlassCatalogsResult(catalogsLoadResult);
    }
  }, [catalogsLoadResult, setGlassCatalogsResult]);

  if (!isReady || !proxy) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        Loading glass catalog data…
      </div>
    );
  }

  const catalogsError = storedCatalogsError ?? catalogsLoadResult?.error;

  if (catalogsError !== undefined) {
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        {catalogsError}
      </div>
    );
  }

  const catalogsData = storedCatalogsData ?? catalogsLoadResult?.data;

  if (catalogsData === undefined) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        Loading glass catalog data…
      </div>
    );
  }

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
