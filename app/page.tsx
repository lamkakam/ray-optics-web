"use client";

import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { createStore, useStore } from "zustand";
import type { OpticalModel, SeidelData } from "@/lib/opticalModel";
import type { Theme } from "@/lib/theme";
import { usePyodide } from "@/hooks/usePyodide";
import { surfacesToGridRows, gridRowsToSurfaces } from "@/lib/gridTransform";
import { ExampleSystems } from "@/lib/exampleSystems";
import { createLensEditorSlice, type LensEditorState } from "@/store/lensEditorStore";
import { createSpecsConfigurerSlice, type SpecsConfigurerState } from "@/store/specsConfigurerStore";
import { createAnalysisPlotSlice, type AnalysisPlotState } from "@/store/analysisPlotStore";
import { SpecsConfigurerContainer } from "@/components/container/SpecsConfigurerContainer";
import { LensPrescriptionContainer } from "@/components/container/LensPrescriptionContainer";
import { FocusingContainer } from "@/components/container/FocusingContainer";
import { LensLayoutPanel } from "@/components/composite/LensLayoutPanel";
import { AnalysisPlotContainer } from "@/components/container/AnalysisPlotContainer";
import type { PlotType } from "@/components/composite/AnalysisPlotView";
import { FirstOrderChips } from "@/components/composite/FirstOrderChips";
import { ErrorModal } from "@/components/micro/ErrorModal";
import { Button } from "@/components/micro/Button";
import { Tooltip } from "@/components/micro/Tooltip";
import { Header } from "@/components/micro/Header";
import { Select } from "@/components/micro/Select";
import { BottomDrawer } from "@/components/composite/BottomDrawer";
import { ConfirmOverwriteModal } from "@/components/composite/ConfirmOverwriteModal";
import { SettingsModal } from "@/components/composite/SettingsModal";
import { PrivacyPolicyModal } from "@/components/composite/PrivacyPolicyModal";
import { SeidelAberrModal } from "@/components/composite/SeidelAberrModal";
import { ZernikeTermsModal } from "@/components/composite/ZernikeTermsModal";
import type { ZernikeData, ZernikeOrdering } from "@/lib/zernikeData";
import { NUM_NOLL_TERMS, NUM_FRINGE_TERMS } from "@/lib/zernikeData";
import { useScreenBreakpoint } from "@/hooks/useScreenBreakpoint";
import { LoadingOverlay } from "@/components/micro/LoadingOverlay";
import { useTheme } from "@/components/ThemeProvider";

export default function Home() {
  const { proxy, isReady } = usePyodide();
  const screenSize = useScreenBreakpoint();
  const isLG = screenSize === "screenLG";
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const specsStore = useMemo(
    () => createStore<SpecsConfigurerState>(createSpecsConfigurerSlice),
    []
  );

  const lensStore = useMemo(
    () => createStore<LensEditorState>(createLensEditorSlice),
    []
  );

  const analysisPlotStore = useMemo(
    () => createStore<AnalysisPlotState>(createAnalysisPlotSlice),
    []
  );

  const selectedFieldIndex = useStore(analysisPlotStore, (s) => s.selectedFieldIndex);
  const selectedWavelengthIndex = useStore(analysisPlotStore, (s) => s.selectedWavelengthIndex);
  const selectedPlotType = useStore(analysisPlotStore, (s) => s.selectedPlotType);

  const [committedOpticalModel, setCommittedOpticalModel] = useState<OpticalModel | undefined>();
  const [layoutImage, setLayoutImage] = useState<string | undefined>();
  const [layoutLoading, setLayoutLoading] = useState(false);
  const [firstOrderData, setFirstOrderData] = useState<
    Record<string, number> | undefined
  >();
  const [computing, setComputing] = useState(false);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [privacyPolicyModalOpen, setPrivacyPolicyModalOpen] = useState(false);
  const [seidelData, setSeidelData] = useState<SeidelData | undefined>();
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

  const handleThemeChange =
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selected = e.target.value as Theme;
      if (selected !== theme) {
        setTheme(selected);
      }
    };

  const handleFetchZernikeData = useCallback(
    async (fieldIndex: number, wvlIndex: number, ordering: ZernikeOrdering): Promise<ZernikeData> => {
      if (!proxy) throw new Error("Pyodide not ready");
      if (!committedOpticalModel) throw new Error("No optical model computed yet");
      const numTerms = ordering === "noll" ? NUM_NOLL_TERMS : NUM_FRINGE_TERMS;
      return proxy.getZernikeCoefficients(committedOpticalModel, fieldIndex, wvlIndex, numTerms, ordering);
    },
    [proxy, committedOpticalModel],
  );

  const getPlotFunction = useCallback(
    (plotType: PlotType, model?: OpticalModel): ((fieldIndex: number, wavelengthIndex: number) => Promise<string>) | undefined => {
      const m = model ?? committedOpticalModel;
      if (!proxy || !m) return undefined;
      switch (plotType) {
        case "rayFan":
          return (fi, _) => proxy.plotRayFan(m, fi);
        case "opdFan":
          return (fi, _) => proxy.plotOpdFan(m, fi);
        case "spotDiagram":
          return (fi, _) => proxy.plotSpotDiagram(m, fi);
        case "surfaceBySurface3rdOrder":
          return (_, __) => proxy.plotSurfaceBySurface3rdOrderAberr(m);
        case "wavefrontMap":
          return (fi, wi) => proxy.plotWavefrontMap(m, fi, wi);
        case "geoPSF":
          return (fi, wi) => proxy.plotGeoPSF(m, fi, wi);
        case "diffractionPSF":
          return (fi, wi) => proxy.plotDiffractionPSF(m, fi, wi);
      }
    },
    [proxy, committedOpticalModel]
  );

  const handleSubmit = useCallback(async () => {
    if (!proxy) return;

    const autoAperture = lensStore.getState().autoAperture;
    const setAutoAperture = autoAperture ? "autoAperture" as const : "manualAperture" as const;
    const specs = specsStore.getState().toOpticalSpecs();
    const surfacesData = gridRowsToSurfaces(lensStore.getState().rows);
    const model: OpticalModel = { setAutoAperture, specs, ...surfacesData };

    setComputing(true);
    setLayoutLoading(true);
    analysisPlotStore.getState().setPlotLoading(true);

    try {
      const clampedFieldIndex = Math.min(
        selectedFieldIndex,
        specs.field.fields.length - 1
      );
      if (clampedFieldIndex !== selectedFieldIndex) {
        analysisPlotStore.getState().setSelectedFieldIndex(clampedFieldIndex);
      }

      const clampedWavelengthIndex = Math.min(
        selectedWavelengthIndex,
        specs.wavelengths.weights.length - 1
      );
      if (clampedWavelengthIndex !== selectedWavelengthIndex) {
        analysisPlotStore.getState().setSelectedWavelengthIndex(clampedWavelengthIndex);
      }

      const plotFn = getPlotFunction(selectedPlotType, model);
      const [fod, layout, plot, seidel] = await Promise.all([
        proxy.getFirstOrderData(model),
        proxy.plotLensLayout(model),
        plotFn ? plotFn(clampedFieldIndex, clampedWavelengthIndex) : Promise.resolve(undefined),
        proxy.get3rdOrderSeidelData(model),
      ]);

      setFirstOrderData(fod);
      setLayoutImage(layout);
      analysisPlotStore.getState().setPlotImage(plot);
      setSeidelData(seidel);
      specsStore.getState().setCommittedSpecs(specs);
      setCommittedOpticalModel(model);
    } catch (err) {
      console.log("Update System failed:", err);
      setErrorModalOpen(true);
    } finally {
      setComputing(false);
      setLayoutLoading(false);
      analysisPlotStore.getState().setPlotLoading(false);

      // Reset example selection dropdown
      if (exampleSelectRef.current) {
        exampleSelectRef.current.value = "";
      }
    }
  }, [proxy, specsStore, lensStore, analysisPlotStore, selectedFieldIndex, selectedWavelengthIndex, selectedPlotType, getPlotFunction]);

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

  const drawerTabs = useMemo(
    () => [
      {
        id: "specs",
        label: "System Specs",
        content: <SpecsConfigurerContainer store={specsStore} />,
      },
      {
        id: "prescription",
        label: "Prescription",
        content: (
          <LensPrescriptionContainer
            store={lensStore}
            getOpticalModel={getOpticalModel}
            onImportJson={handleImportJson}
            onUpdateSystem={handleSubmit}
            isUpdateSystemDisabled={!isReady || computing}
          />
        ),
      },
      {
        id: "focusing",
        label: "Focusing",
        content: (
          <FocusingContainer
            lensStore={lensStore}
            specsStore={specsStore}
            proxy={proxy}
            isReady={isReady}
            computing={computing}
            getOpticalModel={getOpticalModel}
            onUpdateSystem={handleSubmit}
            onError={() => setErrorModalOpen(true)}
          />
        ),
      },
    ],
    [specsStore, lensStore, getOpticalModel, handleImportJson, handleSubmit, isReady, computing, proxy]
  );

  const errorModal = (
    <ErrorModal
      isOpen={errorModalOpen}
      onClose={() => setErrorModalOpen(false)}
    />
  );

  const initOverlayNode = !isReady && (
    <LoadingOverlay
      title="Initializing Ray Optics"
      contents="Loading Pyodide and installing packages…"
    />
  );

  const confirmOverwriteModalNode = (
    <ConfirmOverwriteModal
      isOpen={pendingExample !== undefined}
      onConfirm={handleExampleConfirm}
      onCancel={handleExampleCancel}
    />
  );

  const settingsModalNode = (
    <SettingsModal
      isOpen={settingsModalOpen}
      theme={theme}
      onThemeChange={handleThemeChange}
      onClose={() => setSettingsModalOpen(false)}
    />
  );

  const privacyPolicyModalNode = (
    <PrivacyPolicyModal
      isOpen={privacyPolicyModalOpen}
      onClose={() => setPrivacyPolicyModalOpen(false)}
    />
  );

  const lensLayoutPanel = (
    <LensLayoutPanel
      imageBase64={layoutImage}
      loading={layoutLoading}
    />
  );

  const analysisPlotContainer = (
    <AnalysisPlotContainer
      store={analysisPlotStore}
      proxy={proxy}
      committedOpticalModel={committedOpticalModel}
      specsStore={specsStore}
      onError={() => setErrorModalOpen(true)}
      autoHeight={!isLG}
    />
  );


  const firstOrderChips = <FirstOrderChips data={firstOrderData} />;

  const privacyPolicyButton = (
    <Tooltip text="Privacy Policy" position="bottom" noTouch>
      <Button
        variant="secondary"
        size="sm"
        aria-label="Privacy Policy"
        onClick={() => setPrivacyPolicyModalOpen(true)}
      >
        🔒
      </Button>
    </Tooltip>
  );

  const settingButton = (
    <Tooltip text="Settings" position="bottom" noTouch>
      <Button
        variant="secondary"
        size="sm"
        aria-label="Settings"
        onClick={() => setSettingsModalOpen(true)}
      >
        ⚙
      </Button>
    </Tooltip>
  );

  const seidelButton = seidelData && (
    <div className={isLG ? undefined : "mb-2"}>
      <Tooltip text="View 3rd-order Seidel aberration coefficients" position="bottom" noTouch>
        <Button variant="secondary" size="sm" aria-label="3rd Order Seidel Aberrations" onClick={() => setSeidelModalOpen(true)}>
          3rd Order Seidel Aberr.
        </Button>
      </Tooltip>
    </div>
  );

  const seidelModalNode = seidelData && (
    <SeidelAberrModal
      isOpen={seidelModalOpen}
      data={seidelData}
      onClose={() => setSeidelModalOpen(false)}
    />
  );

  const zernikeButton = seidelData && (
    <div className={isLG ? undefined : "mb-2"}>
      <Tooltip text="View Zernike polynomial coefficients" position="bottom" noTouch>
        <Button variant="secondary" size="sm" aria-label="Zernike Terms" onClick={() => setZernikeModalOpen(true)}>
          Zernike Terms
        </Button>
      </Tooltip>
    </div>
  );

  const zernikeModalNode = seidelData && (
    <ZernikeTermsModal
      isOpen={zernikeModalOpen}
      fieldOptions={specsStore.getState().getFieldOptions()}
      wavelengthOptions={specsStore.getState().getWavelengthOptions()}
      onFetchData={handleFetchZernikeData}
      onClose={() => setZernikeModalOpen(false)}
    />
  );

  const exampleSystemDropdown = (
    <Select
      ref={exampleSelectRef}
      type="compact"
      placeholder="Select an example system..."
      aria-label="Example system"
      options={exampleSystemNames.map((name) => ({ value: name, label: name }))}
      defaultValue=""
      onChange={handleExampleChange}
      className={isLG ? "max-w-xs" : "mb-2 w-full"}
    />
  );

  const layoutLG: React.ReactNode = (
    <div className="flex flex-col h-screen">
      <header className="flex h-12 shrink-0 items-center gap-4 border-gray-200 px-4 dark:border-gray-700">
        <Header level={1}>Ray Optics Web</Header>
        {exampleSystemDropdown}
        {seidelButton}
        {zernikeButton}
        <span className="ml-auto flex items-center gap-2">
          {privacyPolicyButton}
          {settingButton}
        </span>
      </header>

      <div className="flex shrink-0 gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        {firstOrderChips}
      </div>

      <div className="flex min-h-0 flex-1 flex-row">
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4 w-[65%]">
          {lensLayoutPanel}
        </div>
        <div className="flex flex-1 flex-col min-h-0 p-4 border-l border-gray-200 dark:border-gray-700 w-[35%]">
          {analysisPlotContainer}
        </div>
      </div>

      <BottomDrawer tabs={drawerTabs} draggable={true} />
      {confirmOverwriteModalNode}
      {errorModal}
      {settingsModalNode}
      {seidelModalNode}
      {zernikeModalNode}
      {initOverlayNode}
    </div >
  );

  const layoutSM: React.ReactNode = (
    <div className="flex flex-col">
      <header className="shrink-0 border-b border-gray-200 px-4 py-2 dark:border-gray-700">
        <div className="flex items-center mb-2">
          <Header level={1}>Ray Optics Web</Header>
          <span className="ml-auto flex items-center gap-2">
            {privacyPolicyButton}
            {settingButton}
          </span>
        </div>
        {exampleSystemDropdown}
        {seidelButton}
        {zernikeButton}
        <div className="flex flex-wrap gap-2">
          {firstOrderChips}
        </div>
      </header>

      <div className="flex flex-col">
        <div data-testid="lens-layout-container" className="w-full px-2 py-3">
          {lensLayoutPanel}
        </div>
        <div data-testid="analysis-plot-container" className="w-full px-2 py-3 border-t border-gray-200 dark:border-gray-700">
          {analysisPlotContainer}
        </div>
      </div>

      <BottomDrawer tabs={drawerTabs} draggable={false} />
      {confirmOverwriteModalNode}
      {errorModal}
      {settingsModalNode}
      {privacyPolicyModalNode}
      {seidelModalNode}
      {zernikeModalNode}
      {initOverlayNode}
    </div >
  );

  return isLG ? layoutLG : layoutSM;
}
