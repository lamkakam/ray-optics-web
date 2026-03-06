"use client";

import React, { useState, useCallback, useMemo } from "react";
import { createStore } from "zustand";
import type { Surfaces, OpticalSpecs } from "@/lib/opticalModel";
import { usePyodide } from "@/hooks/usePyodide";
import { surfacesToGridRows, gridRowsToSurfaces } from "@/lib/gridTransform";
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
import { BottomDrawer } from "@/components/composite/BottomDrawer";

const DEMO_SURFACES: Surfaces = {
  object: { distance: 1e10 },
  image: { curvatureRadius: 0 },
  surfaces: [
    {
      label: "Default",
      curvatureRadius: 26.777,
      thickness: 6.0,
      medium: "SK16",
      manufacturer: "Schott",
      semiDiameter: 12.5,
    },
    {
      label: "Default",
      curvatureRadius: -200.0,
      thickness: 3.0,
      medium: "air",
      manufacturer: "",
      semiDiameter: 12.5,
    },
    {
      label: "Stop",
      curvatureRadius: -35.0,
      thickness: 2.0,
      medium: "F2",
      manufacturer: "Schott",
      semiDiameter: 10.0,
    },
    {
      label: "Default",
      curvatureRadius: 35.0,
      thickness: 3.0,
      medium: "air",
      manufacturer: "",
      semiDiameter: 10.0,
    },
    {
      label: "Default",
      curvatureRadius: 200.0,
      thickness: 6.0,
      medium: "SK16",
      manufacturer: "Schott",
      semiDiameter: 12.5,
    },
    {
      label: "Default",
      curvatureRadius: -26.777,
      thickness: 68.0,
      medium: "air",
      manufacturer: "",
      semiDiameter: 12.5,
    },
  ],
};

const DEMO_SPECS: OpticalSpecs = {
  pupil: { space: "object", type: "epd", value: 25 },
  field: {
    space: "object",
    type: "angle",
    maxField: 20,
    fields: [0, 0.7, 1],
    isRelative: true,
  },
  wavelengths: {
    weights: [
      [486.133, 1],
      [587.562, 1],
      [656.273, 1],
    ],
    referenceIndex: 1,
  },
};

export default function Home() {
  const { proxy, isReady } = usePyodide();

  const specsStore = useMemo(() => {
    const s = createStore<SpecsConfigurerState>(createSpecsConfigurerSlice);
    s.getState().loadFromSpecs(DEMO_SPECS);
    return s;
  }, []);

  const lensStore = useMemo(() => {
    const s = createStore<LensEditorState>(createLensEditorSlice);
    s.getState().setRows(surfacesToGridRows(DEMO_SURFACES));
    return s;
  }, []);

  const [committedSpecs, setCommittedSpecs] = useState<OpticalSpecs>(DEMO_SPECS);
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
      const plotFn = getPlotFunction(selectedPlotType);
      const [fod, layout, plot] = await Promise.all([
        proxy.getFirstOrderData(),
        proxy.plotLensLayout(),
        plotFn ? plotFn(selectedFieldIndex) : Promise.resolve(undefined),
      ]);

      setFirstOrderData(fod);
      setLayoutImage(layout);
      setPlotImage(plot);
      setCommittedSpecs(specs);
    } catch {
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
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Lens layout */}
        <div className="flex flex-1 items-center justify-center p-4 lg:w-[65%]">
          <LensLayoutPanel
            imageBase64={layoutImage}
            loading={layoutLoading}
            onRefresh={handleRefreshLayout}
          />
        </div>

        {/* Analysis sidebar */}
        <div className="border-t border-gray-200 p-4 lg:w-[35%] lg:border-l lg:border-t-0 dark:border-gray-700">
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

      {/* Error modal */}
      <ErrorModal
        isOpen={errorModalOpen}
        onClose={() => setErrorModalOpen(false)}
      />
    </div>
  );
}
