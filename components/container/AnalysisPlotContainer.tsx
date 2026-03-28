"use client";

import React, { useCallback, useMemo } from "react";
import { useStore } from "zustand";
import type { StoreApi } from "zustand";
import type { OpticalModel, OpticalSpecs } from "@/lib/opticalModel";
import type { PyodideWorkerAPI } from "@/hooks/usePyodide";
import type { AnalysisPlotState } from "@/store/analysisPlotStore";
import {
  AnalysisPlotView,
  PLOT_TYPE_CONFIG,
  type PlotType,
} from "@/components/composite/AnalysisPlotView";

interface AnalysisPlotContainerProps {
  readonly store: StoreApi<AnalysisPlotState>;
  readonly proxy: PyodideWorkerAPI | undefined;
  readonly committedOpticalModel: OpticalModel | undefined;
  readonly committedSpecs: OpticalSpecs;
  readonly onError: () => void;
  readonly autoHeight?: boolean;
}

export function AnalysisPlotContainer({
  store,
  proxy,
  committedOpticalModel,
  committedSpecs,
  onError,
  autoHeight,
}: AnalysisPlotContainerProps) {
  const plotImage = useStore(store, (s) => s.plotImage);
  const plotLoading = useStore(store, (s) => s.plotLoading);
  const selectedFieldIndex = useStore(store, (s) => s.selectedFieldIndex);
  const selectedWavelengthIndex = useStore(store, (s) => s.selectedWavelengthIndex);
  const selectedPlotType = useStore(store, (s) => s.selectedPlotType);

  const fieldOptions = useMemo(() => {
    const { fields, maxField, type } = committedSpecs.field;
    const unit = type === "angle" ? "°" : " mm";
    return fields.map((rf, i) => ({
      label: `${(rf * maxField).toPrecision(3)}${unit}`,
      value: i,
    }));
  }, [committedSpecs.field]);

  const wavelengthOptions = useMemo(() => {
    return committedSpecs.wavelengths.weights.map(([wl], i) => ({
      label: `${wl} nm`,
      value: i,
    }));
  }, [committedSpecs.wavelengths.weights]);

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

  const handleFieldChange = useCallback(async (value: number) => {
    store.getState().setSelectedFieldIndex(value);
    if (!proxy) return;
    if (!PLOT_TYPE_CONFIG[selectedPlotType].fieldDependent) return;
    store.getState().setPlotLoading(true);
    try {
      const plotFn = getPlotFunction(selectedPlotType);
      if (plotFn) {
        const plot = await plotFn(value, selectedWavelengthIndex);
        store.getState().setPlotImage(plot);
      }
    } catch {
      onError();
    } finally {
      store.getState().setPlotLoading(false);
    }
  }, [proxy, store, selectedPlotType, selectedWavelengthIndex, getPlotFunction, onError]);

  const handleWavelengthChange = useCallback(async (value: number) => {
    store.getState().setSelectedWavelengthIndex(value);
    if (!proxy) return;
    if (!PLOT_TYPE_CONFIG[selectedPlotType].fieldDependent) return;
    store.getState().setPlotLoading(true);
    try {
      const plotFn = getPlotFunction(selectedPlotType);
      if (plotFn) {
        const plot = await plotFn(selectedFieldIndex, value);
        store.getState().setPlotImage(plot);
      }
    } catch {
      onError();
    } finally {
      store.getState().setPlotLoading(false);
    }
  }, [proxy, store, selectedPlotType, selectedFieldIndex, getPlotFunction, onError]);

  const handlePlotTypeChange = useCallback(async (plotType: PlotType) => {
    store.getState().setSelectedPlotType(plotType);
    if (!proxy) return;
    store.getState().setPlotLoading(true);
    try {
      const plotFn = getPlotFunction(plotType);
      if (plotFn) {
        const plot = await plotFn(selectedFieldIndex, selectedWavelengthIndex);
        store.getState().setPlotImage(plot);
      }
    } catch {
      onError();
    } finally {
      store.getState().setPlotLoading(false);
    }
  }, [proxy, store, selectedFieldIndex, selectedWavelengthIndex, getPlotFunction, onError]);

  return (
    <AnalysisPlotView
      fieldOptions={fieldOptions}
      wavelengthOptions={wavelengthOptions}
      selectedFieldIndex={selectedFieldIndex}
      selectedWavelengthIndex={selectedWavelengthIndex}
      selectedPlotType={selectedPlotType}
      plotImageBase64={plotImage}
      loading={plotLoading}
      onFieldChange={handleFieldChange}
      onWavelengthChange={handleWavelengthChange}
      onPlotTypeChange={handlePlotTypeChange}
      autoHeight={autoHeight}
    />
  );
}
