"use client";

import React, { useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import type { Surfaces, OpticalSpecs } from "@/lib/opticalModel";
import { LensLayoutPanel } from "@/components/micro/LensLayoutPanel";
import {
  AnalysisPlotView,
  type PlotType,
} from "@/components/micro/AnalysisPlotView";
import { FirstOrderChips } from "@/components/micro/FirstOrderChips";
import { BottomDrawer } from "@/components/composite/BottomDrawer";

const SpecsConfigurerContainer = dynamic(
  () =>
    import("@/components/container/SpecsConfigurerContainer").then(
      (mod) => mod.SpecsConfigurerContainer
    ),
  { ssr: false }
);

const LensPrescriptionContainer = dynamic(
  () =>
    import("@/components/container/LensPrescriptionContainer").then(
      (mod) => mod.LensPrescriptionContainer
    ),
  { ssr: false }
);

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
  const [specs, setSpecs] = useState<OpticalSpecs>(DEMO_SPECS);
  const [layoutImage, setLayoutImage] = useState<string | undefined>();
  const [layoutLoading, setLayoutLoading] = useState(false);
  const [plotImage, setPlotImage] = useState<string | undefined>();
  const [plotLoading, setPlotLoading] = useState(false);
  const [selectedFieldIndex, setSelectedFieldIndex] = useState(0);
  const [selectedPlotType, setSelectedPlotType] = useState<PlotType>("rayFan");
  const [firstOrderData, setFirstOrderData] = useState<
    Record<string, number> | undefined
  >();

  const fieldOptions = useMemo(() => {
    const { fields, maxField, type } = specs.field;
    const unit = type === "angle" ? "°" : " mm";
    return fields.map((rf, i) => ({
      label: `${(rf * maxField).toFixed(1)}${unit}`,
      value: i,
    }));
  }, [specs.field]);

  const handleSpecsChange = useCallback((newSpecs: OpticalSpecs) => {
    setSpecs(newSpecs);
  }, []);

  const handleSurfacesChange = useCallback((_surfaces: Surfaces) => {
    // Will trigger model update when worker integration is connected
  }, []);

  const handleRefreshLayout = useCallback(() => {
    // Will call worker.plotLensLayout() when connected
    setLayoutLoading(true);
    setTimeout(() => setLayoutLoading(false), 100);
  }, []);

  const handleFieldChange = useCallback((fieldIndex: number) => {
    setSelectedFieldIndex(fieldIndex);
    // Will call the appropriate plot function when worker is connected
  }, []);

  const handlePlotTypeChange = useCallback((plotType: PlotType) => {
    setSelectedPlotType(plotType);
    // Will call the appropriate plot function when worker is connected
  }, []);

  const drawerTabs = useMemo(
    () => [
      {
        id: "specs",
        label: "System Specs",
        content: (
          <SpecsConfigurerContainer
            initialSpecs={specs}
            onSpecsChange={handleSpecsChange}
          />
        ),
      },
      {
        id: "prescription",
        label: "Prescription",
        content: (
          <LensPrescriptionContainer
            initialSurfaces={DEMO_SURFACES}
            onSurfacesChange={handleSurfacesChange}
          />
        ),
      },
    ],
    [specs, handleSpecsChange, handleSurfacesChange]
  );

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex h-12 shrink-0 items-center gap-4 border-b border-gray-200 px-4 dark:border-gray-700">
        <h1 className="font-semibold text-gray-900 dark:text-gray-100">
          Ray Optics Web
        </h1>
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
    </div>
  );
}
