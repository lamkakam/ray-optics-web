"use client";

import React, { useState, useCallback } from "react";
import { useStore } from "zustand";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import type { ZernikeData, ZernikeOrdering } from "@/features/lens-editor/types/zernikeData";
import { NUM_NOLL_TERMS, NUM_FRINGE_TERMS } from "@/features/lens-editor/lib/zernikeData";
import { useScreenBreakpoint } from "@/shared/hooks/useScreenBreakpoint";
import { surfacesToGridRows, gridRowsToSurfaces } from "@/shared/lib/lens-prescription-grid/lib/gridTransform";
import { loadAnalysisPlot } from "@/features/analysis/lib/plotFunctions";
import { useSpecsConfiguratorStore } from "@/features/lens-editor/providers/SpecsConfiguratorStoreProvider";
import { useLensEditorStore } from "@/features/lens-editor/providers/LensEditorStoreProvider";
import { useAnalysisPlotStore } from "@/features/analysis/providers/AnalysisPlotStoreProvider";
import { useAnalysisDataStore } from "@/features/analysis/providers/AnalysisDataStoreProvider";
import { useLensLayoutImageStore } from "@/features/analysis/providers/LensLayoutImageStoreProvider";
import { AnalysisPlotContainer } from "@/features/analysis/components";
import {
  BottomDrawerContainer,
  FirstOrderChips,
  LensLayoutPanel,
  SeidelAberrModal,
  ZernikeTermsModal,
} from "@/features/lens-editor/components";
import { Button } from "@/shared/components/primitives/Button";
import { Tooltip } from "@/shared/components/primitives/Tooltip";
import { useTheme } from "@/shared/components/providers/ThemeProvider";

export interface LensEditorProps {
  readonly proxy: PyodideWorkerAPI | undefined;
  readonly isReady: boolean;
  readonly onError: () => void;
}

export function LensEditor({
  proxy,
  isReady,
  onError,
}: LensEditorProps) {
  const screenSize = useScreenBreakpoint();
  const isLG = screenSize === "screenLG";
  const { theme } = useTheme();
  const lensStore = useLensEditorStore();
  const specsStore = useSpecsConfiguratorStore();
  const analysisPlotStore = useAnalysisPlotStore();
  const analysisDataStore = useAnalysisDataStore();
  const lensLayoutImageStore = useLensLayoutImageStore();

  const selectedFieldIndex = useStore(analysisPlotStore, (s) => s.selectedFieldIndex);
  const selectedWavelengthIndex = useStore(analysisPlotStore, (s) => s.selectedWavelengthIndex);
  const selectedPlotType = useStore(analysisPlotStore, (s) => s.selectedPlotType);

  const layoutImage = useStore(lensLayoutImageStore, (s) => s.layoutImage);
  const layoutLoading = useStore(lensLayoutImageStore, (s) => s.layoutLoading);
  const firstOrderData = useStore(analysisDataStore, (s) => s.firstOrderData);
  const seidelData = useStore(analysisDataStore, (s) => s.seidelData);
  const committedOpticalModel = useStore(lensStore, (s) => s.committedOpticalModel);
  const [computing, setComputing] = useState(false);
  const [seidelModalOpen, setSeidelModalOpen] = useState(false);
  const [zernikeModalOpen, setZernikeModalOpen] = useState(false);

  const handleFetchZernikeData = useCallback(
    async (fieldIndex: number, wvlIndex: number, ordering: ZernikeOrdering): Promise<ZernikeData> => {
      if (!proxy) throw new Error("Pyodide not ready");
      const committedOpticalModel = lensStore.getState().committedOpticalModel;
      if (!committedOpticalModel) throw new Error("No optical model computed yet");
      const numTerms = ordering === "noll" ? NUM_NOLL_TERMS : NUM_FRINGE_TERMS;
      return proxy.getZernikeCoefficients(committedOpticalModel, fieldIndex, wvlIndex, numTerms, ordering);
    },
    [proxy, lensStore]
  );

  const handleSubmit = useCallback(async () => {
    if (!proxy) return;

    const autoAperture = lensStore.getState().autoAperture;
    const setAutoAperture = autoAperture ? "autoAperture" as const : "manualAperture" as const;
    const specs = specsStore.getState().toOpticalSpecs();
    const surfacesData = gridRowsToSurfaces(lensStore.getState().rows);
    const model: OpticalModel = { setAutoAperture, specs, ...surfacesData };
    const isDark = theme === "dark";

    setComputing(true);
    lensLayoutImageStore.getState().setLayoutLoading(true);
    analysisPlotStore.getState().setPlotLoading(true);

    try {
      const clampedFieldIndex = specsStore.getState().clampFieldIndex(selectedFieldIndex, specs);
      const clampedWavelengthIndex = specsStore.getState().clampWavelengthIndex(selectedWavelengthIndex, specs);
      analysisPlotStore.getState().setSelectedFieldIndex(clampedFieldIndex, specs.field.fields.length);
      analysisPlotStore.getState().setSelectedWavelengthIndex(clampedWavelengthIndex, specs.wavelengths.weights.length);

      const [fod, layout, plotResult, seidel] = await Promise.all([
        proxy.getFirstOrderData(model),
        proxy.plotLensLayout(model, isDark),
        loadAnalysisPlot({
          plotType: selectedPlotType,
          proxy,
          model,
          fieldIndex: clampedFieldIndex,
          wavelengthIndex: clampedWavelengthIndex,
        }),
        proxy.get3rdOrderSeidelData(model),
      ]);

      analysisDataStore.getState().setFirstOrderData(fod);
      lensLayoutImageStore.getState().setLayoutImage(layout);
      if (plotResult?.kind === "wavefrontMap") {
        analysisPlotStore.getState().setWavefrontMapData(plotResult.wavefrontMapData);
      } else if (plotResult?.kind === "rayFan") {
        analysisPlotStore.getState().setRayFanData(plotResult.rayFanData);
      } else if (plotResult?.kind === "opdFan") {
        analysisPlotStore.getState().setOpdFanData(plotResult.opdFanData);
      } else if (plotResult?.kind === "spotDiagram") {
        analysisPlotStore.getState().setSpotDiagramData(plotResult.spotDiagramData);
      } else if (plotResult?.kind === "geoPSF") {
        analysisPlotStore.getState().setGeoPsfData(plotResult.geoPsfData);
      } else if (plotResult?.kind === "diffractionPSF") {
        analysisPlotStore.getState().setDiffractionPsfData(plotResult.diffractionPsfData);
      }
      analysisDataStore.getState().setSeidelData(seidel);
      specsStore.getState().setCommittedSpecs(specs);
      lensStore.getState().setCommittedOpticalModel(model);
    } catch (err) {
      console.log("Update System failed:", err);
      onError();
    } finally {
      setComputing(false);
      lensLayoutImageStore.getState().setLayoutLoading(false);
      analysisPlotStore.getState().setPlotLoading(false);
    }
  }, [proxy, specsStore, lensStore, analysisPlotStore, lensLayoutImageStore, analysisDataStore, selectedFieldIndex, selectedWavelengthIndex, selectedPlotType, onError, theme]);

  const getOpticalModel = useCallback((): OpticalModel => {
    const autoAperture = lensStore.getState().autoAperture;
    const setAutoAperture = autoAperture ? "autoAperture" as const : "manualAperture" as const;
    const specs = specsStore.getState().toOpticalSpecs();
    const surfaces = gridRowsToSurfaces(lensStore.getState().rows);
    return { setAutoAperture, specs, ...surfaces };
  }, [specsStore, lensStore]);

  const handleImportJson = useCallback((data: OpticalModel) => {
    specsStore.getState().loadFromSpecs(data.specs);
    lensStore.getState().setRows(surfacesToGridRows(data));
    lensStore.getState().setAutoAperture(data.setAutoAperture === "autoAperture");
  }, [specsStore, lensStore]);

  const seidelButton = seidelData && (
    <div className={isLG ? undefined : "mb-2"}>
      <Tooltip text="View 3rd-order Seidel aberration coefficients" position="bottom" noTouch>
        <Button
          variant="secondary"
          size="sm"
          aria-label="3rd Order Seidel Aberrations"
          onClick={() => setSeidelModalOpen(true)}
        >
          3rd Order Seidel Aberr.
        </Button>
      </Tooltip>
    </div>
  );

  const zernikeButton = committedOpticalModel && (
    <div className={isLG ? undefined : "mb-2"}>
      <Tooltip text="View Zernike polynomial coefficients" position="bottom" noTouch>
        <Button
          variant="secondary"
          size="sm"
          aria-label="Zernike Terms"
          onClick={() => setZernikeModalOpen(true)}
        >
          Zernike Terms
        </Button>
      </Tooltip>
    </div>
  );

  const firstOrderChips = <FirstOrderChips data={firstOrderData} />;

  const lensLayoutPanel = (
    <LensLayoutPanel imageBase64={layoutImage} loading={layoutLoading} />
  );

  const analysisPlotContainer = (
    <AnalysisPlotContainer
      proxy={proxy}
      onError={onError}
      autoHeight={!isLG}
    />
  );

  const bottomDrawer = (
    <BottomDrawerContainer
      getOpticalModel={getOpticalModel}
      onImportJson={handleImportJson}
      onUpdateSystem={handleSubmit}
      isReady={isReady}
      computing={computing}
      proxy={proxy}
      onError={onError}
      draggable={isLG}
    />
  );

  const seidelModal = seidelData && (
    <SeidelAberrModal
      isOpen={seidelModalOpen}
      data={seidelData}
      onClose={() => setSeidelModalOpen(false)}
    />
  );

  const zernikeModal = committedOpticalModel && (
    <ZernikeTermsModal
      isOpen={zernikeModalOpen}
      fieldOptions={specsStore.getState().getFieldOptions()}
      wavelengthOptions={specsStore.getState().getWavelengthOptions()}
      onFetchData={handleFetchZernikeData}
      onClose={() => setZernikeModalOpen(false)}
    />
  );

  const lgContent = (
    <>
      <div className={`flex shrink-0 items-center gap-4 px-4 py-2${!firstOrderData ? " border-b border-gray-200 dark:border-gray-700" : ""}`}>
        {seidelButton}
        {zernikeButton}
      </div>
      {firstOrderData && (
        <div className="flex shrink-0 gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          {firstOrderChips}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-row">
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4 w-[65%]">
          {lensLayoutPanel}
        </div>
        <div data-testid="lg-analysis-plot-panel" className="flex flex-1 flex-col min-h-0 overflow-hidden p-4 border-l border-gray-200 dark:border-gray-700 w-[35%]">
          {analysisPlotContainer}
        </div>
      </div>

      {bottomDrawer}
      {seidelModal}
      {zernikeModal}
    </>
  );

  const smContent = (
    <div data-testid="sm-scroll-container" className="flex-1 min-h-0 overflow-y-auto flex flex-col">
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        {seidelButton}
        {zernikeButton}
        {firstOrderData && (
          <div className="flex flex-wrap gap-2 mt-2">
            {firstOrderChips}
          </div>
        )}
      </div>
      <div data-testid="lens-layout-container" className="w-full px-2 py-3">
        {lensLayoutPanel}
      </div>
      <div data-testid="analysis-plot-container" className="w-full px-2 py-3 border-t border-gray-200 dark:border-gray-700">
        {analysisPlotContainer}
      </div>
      {bottomDrawer}
      {seidelModal}
      {zernikeModal}
    </div>
  );

  return isLG ? lgContent : smContent;
}
