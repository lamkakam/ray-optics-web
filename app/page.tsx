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
import { cx } from "@/components/ui/modalTokens";
import { BottomDrawer } from "@/components/composite/BottomDrawer";
import { useScreenBreakpoint } from "@/hooks/useScreenBreakpoint";

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

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex h-12 shrink-0 items-center gap-4 border-b border-gray-200 px-4 dark:border-gray-700">
        <h1 className="font-semibold text-gray-900 dark:text-gray-100">
          Ray Optics Web
        </h1>
        <select
          ref={exampleSelectRef}
          aria-label="Example system"
          className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          defaultValue=""
          onChange={handleExampleChange}
        >
          <option value="" disabled>
            Load example system...
          </option>
          {exampleSystemNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          disabled={!isReady || computing}
          onClick={handleSubmit}
        >
          Update System
        </button>
        <div className="flex gap-2">
          <FirstOrderChips data={firstOrderData} />
        </div>
      </header>

      {/* Main content */}
      <div className={`flex min-h-0 flex-1 ${isLG ? "flex-row" : "flex-col"}`}>
        {/* Lens layout */}
        <div className={`flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4${isLG ? " w-[65%]" : ""}`}>
          <LensLayoutPanel
            imageBase64={layoutImage}
            loading={layoutLoading}
            onRefresh={handleRefreshLayout}
          />
        </div>

        {/* Analysis sidebar */}
        <div className={`flex flex-1 flex-col min-h-0 p-4 dark:border-gray-700 ${isLG ? "border-l border-gray-200 w-[35%]" : "border-t border-gray-200"}`}>
          <AnalysisPlotView
            fieldOptions={fieldOptions}
            selectedFieldIndex={selectedFieldIndex}
            selectedPlotType={selectedPlotType}
            plotImageBase64={plotImage}
            loading={plotLoading}
            onFieldChange={handleFieldChange}
            onPlotTypeChange={handlePlotTypeChange}
          />
        </div>
      </div>

      {/* Bottom drawer */}
      <BottomDrawer tabs={drawerTabs} />

      {/* Confirm overwrite modal */}
      {pendingExample !== undefined && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className={cx.backdrop} onClick={handleExampleCancel} />
          <div className={`${cx.panel} max-w-md`} role="dialog" aria-modal="true">
            <h2 className={cx.title}>Load Example System</h2>
            <p className="mb-6 text-sm text-gray-700 dark:text-gray-300">
              This will overwrite your current configuration. Continue?
            </p>
            <div className="flex justify-end gap-3">
              <button type="button" className={cx.btnSecondary} onClick={handleExampleCancel}>
                Cancel
              </button>
              <button type="button" className={cx.btnPrimary} onClick={handleExampleConfirm}>
                Load
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error modal */}
      <ErrorModal
        isOpen={errorModalOpen}
        onClose={() => setErrorModalOpen(false)}
      />

      {/* Initialization overlay */}
      {!isReady && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-gray-900/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-xl bg-white/10 px-10 py-8 text-white shadow-xl dark:bg-black/20">
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
            <p className="text-lg font-semibold tracking-wide">Initializing Ray Optics</p>
            <p className="text-sm text-white/70">Loading Pyodide and installing packages…</p>
          </div>
        </div>
      )}
    </div>
  );
}
