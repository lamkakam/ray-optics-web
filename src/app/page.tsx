"use client";

import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { createStore, useStore } from "zustand";
import type { OpticalModel, SeidelData } from "@/lib/opticalModel";
import type { Theme } from "@/lib/theme";
import type { AppView } from "@/lib/appView";
import { usePyodide } from "@/hooks/usePyodide";
import { surfacesToGridRows, gridRowsToSurfaces } from "@/lib/gridTransform";
import { ExampleSystems } from "@/lib/exampleSystems";
import { createLensEditorSlice, type LensEditorState } from "@/store/lensEditorStore";
import { createSpecsConfigurerSlice, type SpecsConfigurerState } from "@/store/specsConfigurerStore";
import { createAnalysisPlotSlice, type AnalysisPlotState } from "@/store/analysisPlotStore";
import { LensLayoutPanel } from "@/components/composite/LensLayoutPanel";
import { AnalysisPlotContainer } from "@/components/container/AnalysisPlotContainer";
import { buildPlotFn } from "@/lib/plotFunctions";
import { BottomDrawerContainer } from "@/components/container/BottomDrawerContainer";
import { FirstOrderChips } from "@/components/composite/FirstOrderChips";
import { ErrorModal } from "@/components/micro/ErrorModal";
import { Button } from "@/components/micro/Button";
import { Header } from "@/components/micro/Header";
import { Select } from "@/components/micro/Select";
import { Tooltip } from "@/components/micro/Tooltip";
import { ConfirmOverwriteModal } from "@/components/composite/ConfirmOverwriteModal";
import { SeidelAberrModal } from "@/components/composite/SeidelAberrModal";
import { ZernikeTermsModal } from "@/components/composite/ZernikeTermsModal";
import { SideNav } from "@/components/composite/SideNav";
import { SettingsView } from "@/components/composite/SettingsView";
import { PrivacyPolicyView } from "@/components/composite/PrivacyPolicyView";
import { AboutView } from "@/components/composite/AboutView";
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

  const [layoutImage, setLayoutImage] = useState<string | undefined>();
  const [layoutLoading, setLayoutLoading] = useState(false);
  const [firstOrderData, setFirstOrderData] = useState<
    Record<string, number> | undefined
  >();
  const [computing, setComputing] = useState(false);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [sideNavOpen, setSideNavOpen] = useState(false);
  const [currentView, setCurrentView] = useState<AppView>("home");
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
      const committedOpticalModel = lensStore.getState().committedOpticalModel;
      if (!committedOpticalModel) throw new Error("No optical model computed yet");
      const numTerms = ordering === "noll" ? NUM_NOLL_TERMS : NUM_FRINGE_TERMS;
      return proxy.getZernikeCoefficients(committedOpticalModel, fieldIndex, wvlIndex, numTerms, ordering);
    },
    [proxy, lensStore],
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

      setFirstOrderData(fod);
      setLayoutImage(layout);
      analysisPlotStore.getState().setPlotImage(plot);
      setSeidelData(seidel);
      specsStore.getState().setCommittedSpecs(specs);
      lensStore.getState().setCommittedOpticalModel(model);
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
  }, [proxy, specsStore, lensStore, analysisPlotStore, selectedFieldIndex, selectedWavelengthIndex, selectedPlotType]);

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
      lensStore={lensStore}
      specsStore={specsStore}
      onError={() => setErrorModalOpen(true)}
      autoHeight={!isLG}
    />
  );

  const firstOrderChips = <FirstOrderChips data={firstOrderData} />;

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

  const hamburgerButton = (
    <Button
      variant="secondary"
      size="sm"
      aria-label="Open navigation"
      onClick={() => setSideNavOpen((prev) => !prev)}
    >
      ☰
    </Button>
  );

  const sideNavNode = (
    <SideNav
      isOpen={sideNavOpen}
      isLG={isLG}
      currentView={currentView}
      onClose={() => setSideNavOpen(false)}
      onNavigate={(view) => { setCurrentView(view); setSideNavOpen(false); }}
    />
  );

  const layoutLG: React.ReactNode = (
    <div className="flex flex-col h-screen">
      <header className="shrink-0 border-b border-gray-200 dark:border-gray-700">
        <div className="flex h-12 items-center gap-4 px-4">
          {hamburgerButton}
          <Header level={1}>Ray Optics Web</Header>
        </div>
      </header>

      <div className="relative flex-1 flex flex-col min-h-0">
        {sideNavNode}

        {currentView === "home" && (
          <>
            <div className="flex shrink-0 items-center gap-4 px-4 py-2">
              {exampleSystemDropdown}
              {seidelButton}
              {zernikeButton}
            </div>
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

            <BottomDrawerContainer
              specsStore={specsStore}
              lensStore={lensStore}
              getOpticalModel={getOpticalModel}
              onImportJson={handleImportJson}
              onUpdateSystem={handleSubmit}
              isReady={isReady}
              computing={computing}
              proxy={proxy}
              onError={() => setErrorModalOpen(true)}
              draggable={true}
            />
          </>
        )}

        {currentView === "settings" && (
          <SettingsView theme={theme} onThemeChange={handleThemeChange} />
        )}

        {currentView === "privacy-policy" && <PrivacyPolicyView />}

        {currentView === "about" && <AboutView />}
      </div>

      {confirmOverwriteModalNode}
      {errorModal}
      {seidelModalNode}
      {zernikeModalNode}
      {initOverlayNode}
    </div>
  );

  const layoutSM: React.ReactNode = (
    <div className="flex flex-col">
      <header className="shrink-0 border-b border-gray-200 px-4 py-2 dark:border-gray-700">
        <div className="flex items-center">
          {hamburgerButton}
          <Header level={1} className="ml-2">Ray Optics Web</Header>
        </div>
      </header>

      <div className="relative flex flex-col">
        {sideNavNode}

        {currentView === "home" && (
          <>
            <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
              {exampleSystemDropdown}
              {seidelButton}
              {zernikeButton}
              <div className="flex flex-wrap gap-2 mt-2">
                {firstOrderChips}
              </div>
            </div>
            <div data-testid="lens-layout-container" className="w-full px-2 py-3">
              {lensLayoutPanel}
            </div>
            <div data-testid="analysis-plot-container" className="w-full px-2 py-3 border-t border-gray-200 dark:border-gray-700">
              {analysisPlotContainer}
            </div>
          </>
        )}

        {currentView === "settings" && (
          <SettingsView theme={theme} onThemeChange={handleThemeChange} />
        )}

        {currentView === "privacy-policy" && <PrivacyPolicyView />}

        {currentView === "about" && <AboutView />}
      </div>

      {currentView === "home" && (
        <BottomDrawerContainer
          specsStore={specsStore}
          lensStore={lensStore}
          getOpticalModel={getOpticalModel}
          onImportJson={handleImportJson}
          onUpdateSystem={handleSubmit}
          isReady={isReady}
          computing={computing}
          proxy={proxy}
          onError={() => setErrorModalOpen(true)}
          draggable={false}
        />
      )}

      {confirmOverwriteModalNode}
      {errorModal}
      {seidelModalNode}
      {zernikeModalNode}
      {initOverlayNode}
    </div>
  );

  return isLG ? layoutLG : layoutSM;
}
