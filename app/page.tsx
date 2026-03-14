"use client";

import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { createStore } from "zustand";
import type { OpticalSpecs, OpticalModel, ImportedLensData, SeidelData } from "@/lib/opticalModel";
import type { Theme } from "@/lib/theme";
import { usePyodide } from "@/hooks/usePyodide";
import { surfacesToGridRows, gridRowsToSurfaces } from "@/lib/gridTransform";
import { ExampleSystems } from "@/lib/exampleSystems";
import { createLensEditorSlice, type LensEditorState } from "@/store/lensEditorStore";
import { createSpecsConfigurerSlice, type SpecsConfigurerState } from "@/store/specsConfigurerStore";
import { SpecsConfigurerContainer } from "@/components/container/SpecsConfigurerContainer";
import { LensPrescriptionContainer } from "@/components/container/LensPrescriptionContainer";
import { LensLayoutPanel } from "@/components/composite/LensLayoutPanel";
import {
  AnalysisPlotView,
  PLOT_TYPE_CONFIG,
  type PlotType,
} from "@/components/composite/AnalysisPlotView";
import { FirstOrderChips } from "@/components/composite/FirstOrderChips";
import { ErrorModal } from "@/components/micro/ErrorModal";
import { Button } from "@/components/micro/Button";
import { Tooltip } from "@/components/micro/Tooltip";
import { Header } from "@/components/micro/Header";
import { Select } from "@/components/micro/Select";
import { BottomDrawer } from "@/components/composite/BottomDrawer";
import { ConfirmOverwriteModal } from "@/components/composite/ConfirmOverwriteModal";
import { SettingsModal } from "@/components/composite/SettingsModal";
import { SeidelAberrModal } from "@/components/composite/SeidelAberrModal";
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

  const [committedSpecs, setCommittedSpecs] = useState<OpticalSpecs>(
    () => specsStore.getState().toOpticalSpecs()
  );
  const [layoutImage, setLayoutImage] = useState<string | undefined>();
  const [layoutLoading, setLayoutLoading] = useState(false);
  const [plotImage, setPlotImage] = useState<string | undefined>();
  const [plotLoading, setPlotLoading] = useState(false);
  const [selectedFieldIndex, setSelectedFieldIndex] = useState(0);
  const [selectedPlotType, setSelectedPlotType] = useState<PlotType>("rayFan");
  const [firstOrderData, setFirstOrderData] = useState<
    Record<string, number> | undefined
  >();
  const [computing, setComputing] = useState(false);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [seidelData, setSeidelData] = useState<SeidelData | undefined>();
  const [seidelModalOpen, setSeidelModalOpen] = useState(false);
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

  const handleExampleConfirm = useCallback(() => {
    if (!pendingExample) return;
    const system = ExampleSystems[pendingExample];
    if (!system) return;
    specsStore.getState().loadFromSpecs(system.specs);
    lensStore.getState().setRows(surfacesToGridRows(system));
    setPendingExample(undefined);
  }, [pendingExample, specsStore, lensStore]);

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

  const fieldOptions = useMemo(() => {
    const { fields, maxField, type } = committedSpecs.field;
    const unit = type === "angle" ? "°" : " mm";
    return fields.map((rf, i) => ({
      label: `${(rf * maxField).toPrecision(3)}${unit}`,
      value: i,
    }));
  }, [committedSpecs.field]);

  const getPlotFunction = useCallback(
    (plotType: PlotType): ((fieldIndex: number) => Promise<string>) | undefined => {
      if (!proxy) return undefined;
      switch (plotType) {
        case "rayFan":
          return (fi) => proxy.plotRayFan(fi);
        case "opdFan":
          return (fi) => proxy.plotOpdFan(fi);
        case "spotDiagram":
          return (fi) => proxy.plotSpotDiagram(fi);
        case "surfaceBySurface3rdOrder":
          return (_fi) => proxy.plotSurfaceBySurface3rdOrderAberr();
      }
    },
    [proxy]
  );

  const handleSubmit = useCallback(async () => {
    if (!proxy) return;

    const specs = specsStore.getState().toOpticalSpecs();
    const surfacesData = gridRowsToSurfaces(lensStore.getState().rows);
    const model = { specs, ...surfacesData };

    setComputing(true);
    setLayoutLoading(true);
    setPlotLoading(true);

    try {
      // Step 1: setOpticalSurfaces MUST complete first
      const autoAperture = lensStore.getState().autoAperture;
      const apertureFlag = autoAperture ? "autoAperture" as const : "manualAperture" as const;
      await proxy.setOpticalSurfaces(model, apertureFlag);

      // Step 2: parallel calls
      const clampedFieldIndex = Math.min(
        selectedFieldIndex,
        specs.field.fields.length - 1
      );
      if (clampedFieldIndex !== selectedFieldIndex) {
        setSelectedFieldIndex(clampedFieldIndex);
      }
      const plotFn = getPlotFunction(selectedPlotType);
      const [fod, layout, plot, seidel] = await Promise.all([
        proxy.getFirstOrderData(),
        proxy.plotLensLayout(),
        plotFn ? plotFn(clampedFieldIndex) : Promise.resolve(undefined),
        proxy.get3rdOrderSeidelData(),
      ]);

      setFirstOrderData(fod);
      setLayoutImage(layout);
      setPlotImage(plot);
      setSeidelData(seidel);
      setCommittedSpecs(specs);
    } catch (err) {
      console.log("Update System failed:", err);
      setErrorModalOpen(true);
    } finally {
      setComputing(false);
      setLayoutLoading(false);
      setPlotLoading(false);

      // Reset example selection dropdown
      if (exampleSelectRef.current) {
        exampleSelectRef.current.value = "";
      }
    }
  }, [proxy, specsStore, lensStore, selectedFieldIndex, selectedPlotType, getPlotFunction]);

  const handleFieldChange = useCallback(
    async (fieldIndex: number) => {
      setSelectedFieldIndex(fieldIndex);
      if (!proxy) return;
      if (!PLOT_TYPE_CONFIG[selectedPlotType].fieldDependent) return;
      setPlotLoading(true);
      try {
        const plotFn = getPlotFunction(selectedPlotType);
        if (plotFn) {
          const plot = await plotFn(fieldIndex);
          setPlotImage(plot);
        }
      } catch {
        setErrorModalOpen(true);
      } finally {
        setPlotLoading(false);
      }
    },
    [proxy, selectedPlotType, getPlotFunction]
  );

  const handlePlotTypeChange = useCallback(
    async (plotType: PlotType) => {
      setSelectedPlotType(plotType);
      if (!proxy) return;
      setPlotLoading(true);
      try {
        const plotFn = getPlotFunction(plotType);
        if (plotFn) {
          const plot = await plotFn(selectedFieldIndex);
          setPlotImage(plot);
        }
      } catch {
        setErrorModalOpen(true);
      } finally {
        setPlotLoading(false);
      }
    },
    [proxy, selectedFieldIndex, getPlotFunction]
  );

  const getOpticalModel = useCallback((): OpticalModel => {
    const specs = specsStore.getState().toOpticalSpecs();
    const surfaces = gridRowsToSurfaces(lensStore.getState().rows);
    return { specs, ...surfaces };
  }, [specsStore, lensStore]);

  const handleImportJson = useCallback((data: ImportedLensData) => {
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
        content: <LensPrescriptionContainer store={lensStore} getOpticalModel={getOpticalModel} onImportJson={handleImportJson} />,
      },
    ],
    [specsStore, lensStore, getOpticalModel, handleImportJson]
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

  const lensLayoutPanel = (
    <LensLayoutPanel
      imageBase64={layoutImage}
      loading={layoutLoading}
    />
  );

  const analysisPlotView = (
    <AnalysisPlotView
      fieldOptions={fieldOptions}
      selectedFieldIndex={selectedFieldIndex}
      selectedPlotType={selectedPlotType}
      plotImageBase64={plotImage}
      loading={plotLoading}
      onFieldChange={handleFieldChange}
      onPlotTypeChange={handlePlotTypeChange}
      autoHeight={!isLG}
    />
  );


  const firstOrderChips = <FirstOrderChips data={firstOrderData} />;

  const settingButton = (
    <Tooltip text="Settings" position="bottom">
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

  const updateSystemButton = (
    <Tooltip text="Compute and update the optical system" position="bottom">
      <Button
        variant="primary"
        size="sm"
        className={isLG ? undefined : "mb-2"}
        disabled={!isReady || computing}
        onClick={handleSubmit}
      >
        Update System
      </Button>
    </Tooltip>
  );

  const seidelButton = seidelData && (
    <Button variant="secondary" size="sm" onClick={() => setSeidelModalOpen(true)}>
      3rd Order Seidel Aberr.
    </Button>
  );

  const seidelModalNode = seidelData && (
    <SeidelAberrModal
      isOpen={seidelModalOpen}
      data={seidelData}
      onClose={() => setSeidelModalOpen(false)}
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
      className={isLG ? undefined : "mb-2 w-full"}
    />
  );

  const layoutLG: React.ReactNode = (
    <div className="flex flex-col h-screen">
      <header className="flex h-12 shrink-0 items-center gap-4 border-gray-200 px-4 dark:border-gray-700">
        <Header level={1}>Ray Optics Web</Header>
        {exampleSystemDropdown}
        {updateSystemButton}
        {seidelButton}
        <span className="ml-auto">
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
          {analysisPlotView}
        </div>
      </div>

      <BottomDrawer tabs={drawerTabs} draggable={true} />
      {confirmOverwriteModalNode}
      {errorModal}
      {settingsModalNode}
      {seidelModalNode}
      {initOverlayNode}
    </div>
  );

  const layoutSM: React.ReactNode = (
    <div className="flex flex-col">
      <header className="shrink-0 border-b border-gray-200 px-4 py-2 dark:border-gray-700">
        <div className="flex items-center mb-2">
          <Header level={1}>Ray Optics Web</Header>
          <span className="ml-auto">
            {settingButton}
          </span>
        </div>
        {exampleSystemDropdown}
        {updateSystemButton}
        {seidelButton}
        <div className="flex flex-wrap gap-2">
          {firstOrderChips}
        </div>
      </header>

      <div className="flex flex-col">
        <div className="w-[70vw] mx-auto p-4">
          {lensLayoutPanel}
        </div>
        <div className="w-[70vw] mx-auto p-4 border-t border-gray-200 dark:border-gray-700">
          {analysisPlotView}
        </div>
      </div>

      <BottomDrawer tabs={drawerTabs} draggable={false} />
      {confirmOverwriteModalNode}
      {errorModal}
      {settingsModalNode}
      {seidelModalNode}
      {initOverlayNode}
    </div>
  );

  return isLG ? layoutLG : layoutSM;
}
