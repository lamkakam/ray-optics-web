"use client";

import React, { useState, useCallback, useMemo, useRef } from "react";
import { createStore } from "zustand";
import type { Surfaces, OpticalSpecs } from "@/lib/opticalModel";
import { usePyodide } from "@/hooks/usePyodide";
import { surfacesToGridRows, gridRowsToSurfaces } from "@/lib/gridTransform";
import { ExampleSystems } from "@/lib/exampleSystems";
import { createLensEditorSlice, type LensEditorState } from "@/store/lensEditorStore";
import { createSpecsConfigurerSlice, type SpecsConfigurerState } from "@/store/specsConfigurerStore";
import { SpecsConfigurerContainer } from "@/components/container/SpecsConfigurerContainer";
import { LensPrescriptionContainer } from "@/components/container/LensPrescriptionContainer";
import { LensLayoutPanel } from "@/components/micro/LensLayoutPanel";
import {
  AnalysisPlotView,
  type PlotType,
} from "@/components/micro/AnalysisPlotView";
import { FirstOrderChips } from "@/components/micro/FirstOrderChips";
import { ErrorModal } from "@/components/micro/ErrorModal";
import { Modal } from "@/components/micro/Modal";
import clsx from "clsx";
import { componentTokens as cx } from "@/components/ui/modalTokens";
import { Button } from "@/components/micro/Button";
import { Select } from "@/components/micro/Select";
import { BottomDrawer } from "@/components/composite/BottomDrawer";
import { useScreenBreakpoint } from "@/hooks/useScreenBreakpoint";
import { Paragraph } from "@/components/micro/Paragraph";

export default function Home() {
  const { proxy, isReady } = usePyodide();
  const screenSize = useScreenBreakpoint();
  const isLG = screenSize === "screenLG";

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

  const fieldOptions = useMemo(() => {
    const { fields, maxField, type } = committedSpecs.field;
    const unit = type === "angle" ? "°" : " mm";
    return fields.map((rf, i) => ({
      label: `${(rf * maxField).toFixed(1)}${unit}`,
      value: i,
    }));
  }, [committedSpecs.field]);

  const getPlotFunction = useCallback(
    (plotType: PlotType) => {
      if (!proxy) return undefined;
      switch (plotType) {
        case "rayFan":
          return proxy.plotRayFan;
        case "opdFan":
          return proxy.plotOpdFan;
        case "spotDiagram":
          return proxy.plotSpotDiagram;
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
      await proxy.setOpticalSurfaces(model);

      // Step 2: parallel calls
      const clampedFieldIndex = Math.min(
        selectedFieldIndex,
        specs.field.fields.length - 1
      );
      if (clampedFieldIndex !== selectedFieldIndex) {
        setSelectedFieldIndex(clampedFieldIndex);
      }
      const plotFn = getPlotFunction(selectedPlotType);
      const [fod, layout, plot] = await Promise.all([
        proxy.getFirstOrderData(),
        proxy.plotLensLayout(),
        plotFn ? plotFn(clampedFieldIndex) : Promise.resolve(undefined),
      ]);

      setFirstOrderData(fod);
      setLayoutImage(layout);
      setPlotImage(plot);
      setCommittedSpecs(specs);
    } catch (err) {
      console.log("Update System failed:", err);
      setErrorModalOpen(true);
    } finally {
      setComputing(false);
      setLayoutLoading(false);
      setPlotLoading(false);
    }
  }, [proxy, specsStore, lensStore, selectedFieldIndex, selectedPlotType, getPlotFunction]);

  const handleRefreshLayout = useCallback(async () => {
    if (!proxy) return;
    setLayoutLoading(true);
    try {
      const layout = await proxy.plotLensLayout();
      setLayoutImage(layout);
    } catch {
      setErrorModalOpen(true);
    } finally {
      setLayoutLoading(false);
    }
  }, [proxy]);

  const handleFieldChange = useCallback(
    async (fieldIndex: number) => {
      setSelectedFieldIndex(fieldIndex);
      if (!proxy) return;
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
        content: <LensPrescriptionContainer store={lensStore} />,
      },
    ],
    [specsStore, lensStore]
  );

  const initOverlay = clsx(cx.overlay.style.initLayout, cx.overlay.style.initZIndex, cx.overlay.style.initBlur, cx.overlay.color.initBgColor);
  const initCard = clsx(cx.overlay.style.cardLayout, cx.overlay.style.cardBorderRadius, cx.overlay.size.cardHorizontalPadding, cx.overlay.size.cardVerticalPadding, cx.overlay.style.cardShadow, cx.overlay.color.cardBgColor, cx.overlay.color.cardTextColor);

  const confirmOverwriteModal = (
    <Modal
      isOpen={pendingExample !== undefined}
      title="Load Example System"
    >
      <Paragraph variant="body" className="mb-6">
        This will overwrite your current configuration. Continue?
      </Paragraph>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={handleExampleCancel}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleExampleConfirm}>
          Load
        </Button>
      </div>
    </Modal>
  );

  const errorModal = (
    <ErrorModal
      isOpen={errorModalOpen}
      onClose={() => setErrorModalOpen(false)}
    />
  );

  const initOverlayNode = !isReady && (
    <div className={initOverlay}>
      <div className={initCard}>
        <svg
          className="h-10 w-10 animate-spin text-blue-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <Paragraph className={clsx(`!${cx.overlay.color.cardTextColor}`, "text-lg font-semibold tracking-wide")}>
          Initializing Ray Optics
        </Paragraph>
        <Paragraph className="!text-white/70">
          Loading Pyodide and installing packages…
        </Paragraph>
      </div>
    </div>
  );

  const layoutLG: React.ReactNode = (
    <div className="flex flex-col h-screen">
      <header className="flex h-12 shrink-0 items-center gap-4 border-b border-gray-200 px-4 dark:border-gray-700">
        <h1 className="font-semibold text-gray-900 dark:text-gray-100">
          Ray Optics Web
        </h1>
        <Select
          ref={exampleSelectRef}
          type="compact"
          placeholder="Load example system..."
          aria-label="Example system"
          options={exampleSystemNames.map((name) => ({ value: name, label: name }))}
          defaultValue=""
          onChange={handleExampleChange}
        />
        <Button
          variant="primary"
          disabled={!isReady || computing}
          onClick={handleSubmit}
        >
          Update System
        </Button>
        <div className="flex gap-2">
          <FirstOrderChips data={firstOrderData} />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-row">
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4 w-[65%]">
          <LensLayoutPanel
            imageBase64={layoutImage}
            loading={layoutLoading}
            onRefresh={handleRefreshLayout}
          />
        </div>
        <div className="flex flex-1 flex-col min-h-0 p-4 border-l border-gray-200 dark:border-gray-700 w-[35%]">
          <AnalysisPlotView
            fieldOptions={fieldOptions}
            selectedFieldIndex={selectedFieldIndex}
            selectedPlotType={selectedPlotType}
            plotImageBase64={plotImage}
            loading={plotLoading}
            onFieldChange={handleFieldChange}
            onPlotTypeChange={handlePlotTypeChange}
            autoHeight={false}
          />
        </div>
      </div>

      <BottomDrawer tabs={drawerTabs} draggable={true} />
      {confirmOverwriteModal}
      {errorModal}
      {initOverlayNode}
    </div>
  );

  const layoutSM: React.ReactNode = (
    <div className="flex flex-col">
      <header className="shrink-0 border-b border-gray-200 px-4 py-2 dark:border-gray-700">
        <h1 className="mb-2 font-semibold text-gray-900 dark:text-gray-100">
          Ray Optics Web
        </h1>
        <Select
          ref={exampleSelectRef}
          type="compact"
          placeholder="Load example system..."
          aria-label="Example system"
          options={exampleSystemNames.map((name) => ({ value: name, label: name }))}
          defaultValue=""
          onChange={handleExampleChange}
          className="mb-2 w-full"
        />
        <Button
          variant="primary"
          className="mb-2"
          disabled={!isReady || computing}
          onClick={handleSubmit}
        >
          Update System
        </Button>
        <div className="flex flex-wrap gap-2">
          <FirstOrderChips data={firstOrderData} />
        </div>
      </header>

      <div className="flex flex-col">
        <div className="w-[70vw] mx-auto p-4">
          <LensLayoutPanel
            imageBase64={layoutImage}
            loading={layoutLoading}
            onRefresh={handleRefreshLayout}
          />
        </div>
        <div className="w-[70vw] mx-auto p-4 border-t border-gray-200 dark:border-gray-700">
          <AnalysisPlotView
            fieldOptions={fieldOptions}
            selectedFieldIndex={selectedFieldIndex}
            selectedPlotType={selectedPlotType}
            plotImageBase64={plotImage}
            loading={plotLoading}
            onFieldChange={handleFieldChange}
            onPlotTypeChange={handlePlotTypeChange}
            autoHeight={true}
          />
        </div>
      </div>

      <BottomDrawer tabs={drawerTabs} draggable={false} />
      {confirmOverwriteModal}
      {errorModal}
      {initOverlayNode}
    </div>
  );

  return isLG ? layoutLG : layoutSM;
}
