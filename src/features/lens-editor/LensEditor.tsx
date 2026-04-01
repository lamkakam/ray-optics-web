"use client";

import React, { useState, useCallback, useMemo, useRef } from "react";
import { useStore, type StoreApi } from "zustand";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import type { ZernikeData, ZernikeOrdering } from "@/shared/lib/types/zernikeData";
import { NUM_NOLL_TERMS, NUM_FRINGE_TERMS } from "@/shared/lib/types/zernikeData";
import { useScreenBreakpoint } from "@/shared/hooks/useScreenBreakpoint";
import { surfacesToGridRows, gridRowsToSurfaces } from "@/shared/lib/utils/gridTransform";
import { ExampleSystems } from "@/shared/lib/data/exampleSystems";
import { buildPlotFn } from "@/shared/lib/utils/plotFunctions";
import { useSpecsConfiguratorStore } from "@/features/lens-editor/providers/SpecsConfiguratorStoreProvider";
import { useLensEditorStore } from "@/features/lens-editor/providers/LensEditorStoreProvider";
import type { AnalysisPlotState } from "@/features/analysis/stores/analysisPlotStore";
import type { LensLayoutImageState } from "@/features/analysis/stores/lensLayoutImageStore";
import type { AnalysisDataState } from "@/features/analysis/stores/analysisDataStore";
import { LensLayoutPanel } from "@/features/lens-editor/components/LensLayoutPanel";
import { AnalysisPlotContainer } from "@/features/analysis/components/AnalysisPlotContainer";
import { BottomDrawerContainer } from "@/features/lens-editor/components/BottomDrawerContainer";
import { FirstOrderChips } from "@/features/lens-editor/components/FirstOrderChips";
import { Select } from "@/shared/components/primitives/Select";
import { Button } from "@/shared/components/primitives/Button";
import { Tooltip } from "@/shared/components/primitives/Tooltip";
import { ConfirmOverwriteModal } from "@/features/lens-editor/components/ConfirmOverwriteModal";
import { SeidelAberrModal } from "@/features/lens-editor/components/SeidelAberrModal";
import { ZernikeTermsModal } from "@/features/lens-editor/components/ZernikeTermsModal";

export interface LensEditorProps {
  readonly analysisPlotStore: StoreApi<AnalysisPlotState>;
  readonly lensLayoutImageStore: StoreApi<LensLayoutImageState>;
  readonly analysisDataStore: StoreApi<AnalysisDataState>;
  readonly proxy: PyodideWorkerAPI | undefined;
  readonly isReady: boolean;
  readonly onError: () => void;
}

export function LensEditor({
  analysisPlotStore,
  lensLayoutImageStore,
  analysisDataStore,
  proxy,
  isReady,
  onError,
}: LensEditorProps) {
  const screenSize = useScreenBreakpoint();
  const isLG = screenSize === "screenLG";
  const lensStore = useLensEditorStore();
  const specsStore = useSpecsConfiguratorStore();

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
  const [pendingExample, setPendingExample] = useState<string | undefined>();
  const exampleSelectRef = useRef<HTMLSelectElement>(null);

  const exampleSystemNames = useMemo(() => Object.keys(ExampleSystems), []);

  const handleExampleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const name = e.target.value;
      if (!ExampleSystems[name]) return;
      setPendingExample(name);
    },
    []
  );

  const handleExampleCancel = useCallback(() => {
    setPendingExample(undefined);
    if (exampleSelectRef.current) {
      exampleSelectRef.current.value = "";
    }
  }, []);

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

    setComputing(true);
    lensLayoutImageStore.getState().setLayoutLoading(true);
    analysisPlotStore.getState().setPlotLoading(true);

    try {
      const clampedFieldIndex = specsStore.getState().clampFieldIndex(selectedFieldIndex, specs);
      const clampedWavelengthIndex = specsStore.getState().clampWavelengthIndex(selectedWavelengthIndex, specs);
      analysisPlotStore.getState().setSelectedFieldIndex(clampedFieldIndex, specs.field.fields.length);
      analysisPlotStore.getState().setSelectedWavelengthIndex(clampedWavelengthIndex, specs.wavelengths.weights.length);

      const plotFn = buildPlotFn(selectedPlotType, proxy, model);
      const [fod, layout, plot, seidel] = await Promise.all([
        proxy.getFirstOrderData(model),
        proxy.plotLensLayout(model),
        plotFn ? plotFn(clampedFieldIndex, clampedWavelengthIndex) : Promise.resolve(undefined),
        proxy.get3rdOrderSeidelData(model),
      ]);

      analysisDataStore.getState().setFirstOrderData(fod);
      lensLayoutImageStore.getState().setLayoutImage(layout);
      analysisPlotStore.getState().setPlotImage(plot);
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

      if (exampleSelectRef.current) {
        exampleSelectRef.current.value = "";
      }
    }
  }, [proxy, specsStore, lensStore, analysisPlotStore, lensLayoutImageStore, analysisDataStore, selectedFieldIndex, selectedWavelengthIndex, selectedPlotType, onError]);

  const handleExampleConfirm = useCallback(() => {
    if (!pendingExample) return;
    const system = ExampleSystems[pendingExample];
    if (!system) return;
    specsStore.getState().loadFromSpecs(system.specs);
    lensStore.getState().setRows(surfacesToGridRows(system));
    setPendingExample(undefined);
    void handleSubmit();
  }, [pendingExample, specsStore, lensStore, handleSubmit]);

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

  const exampleSystemDropdown = (
    <Select
      ref={exampleSelectRef}
      type="compact"
      placeholder="Select an example system..."
      aria-label="Example system"
      options={exampleSystemNames.map((name) => ({ value: name, label: name }))}
      defaultValue=""
      onChange={handleExampleChange}
      className={isLG ? "max-w-xs" : `w-full${seidelData ?? firstOrderData ? " mb-2" : ""}`}
    />
  );

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
      store={analysisPlotStore}
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

  const confirmOverwriteModal = (
    <ConfirmOverwriteModal
      isOpen={pendingExample !== undefined}
      onConfirm={handleExampleConfirm}
      onCancel={handleExampleCancel}
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
        {exampleSystemDropdown}
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
      {confirmOverwriteModal}
      {seidelModal}
      {zernikeModal}
    </>
  );

  const smContent = (
    <div data-testid="sm-scroll-container" className="flex-1 min-h-0 overflow-y-auto flex flex-col">
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        {exampleSystemDropdown}
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
      {confirmOverwriteModal}
      {seidelModal}
      {zernikeModal}
    </div>
  );

  return isLG ? lgContent : smContent;
}
