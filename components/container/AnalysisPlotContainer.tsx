"use client";

import React, { useCallback } from "react";
import { useStore } from "zustand";
import type { StoreApi } from "zustand";
import type { PyodideWorkerAPI } from "@/hooks/usePyodide";
import type { AnalysisPlotState } from "@/store/analysisPlotStore";
import type { SpecsConfigurerState } from "@/store/specsConfigurerStore";
import type { LensEditorState } from "@/store/lensEditorStore";
import { buildPlotFn } from "@/lib/plotFunctions";
import {
  AnalysisPlotView,
  PLOT_TYPE_CONFIG,
  type PlotType,
} from "@/components/composite/AnalysisPlotView";

interface AnalysisPlotContainerProps {
  readonly store: StoreApi<AnalysisPlotState>;
  readonly proxy: PyodideWorkerAPI | undefined;
  readonly lensStore: StoreApi<LensEditorState>;
  readonly specsStore: StoreApi<SpecsConfigurerState>;
  readonly onError: () => void;
  readonly autoHeight?: boolean;
}

export function AnalysisPlotContainer({
  store,
  proxy,
  lensStore,
  specsStore,
  onError,
  autoHeight,
}: AnalysisPlotContainerProps) {
  const committedOpticalModel = useStore(lensStore, (s) => s.committedOpticalModel);
  const plotImage = useStore(store, (s) => s.plotImage);
  const plotLoading = useStore(store, (s) => s.plotLoading);
  const selectedFieldIndex = useStore(store, (s) => s.selectedFieldIndex);
  const selectedWavelengthIndex = useStore(store, (s) => s.selectedWavelengthIndex);
  const selectedPlotType = useStore(store, (s) => s.selectedPlotType);

  useStore(specsStore, (s) => s.committedSpecs);
  const fieldOptions = specsStore.getState().getFieldOptions();
  const wavelengthOptions = specsStore.getState().getWavelengthOptions();

  const handleFieldChange = useCallback(async (value: number) => {
    store.getState().setSelectedFieldIndex(value);
    if (!proxy) return;
    if (!PLOT_TYPE_CONFIG[selectedPlotType].fieldDependent) return;
    store.getState().setPlotLoading(true);
    try {
      const plotFn = buildPlotFn(selectedPlotType, proxy, committedOpticalModel);
      if (plotFn) {
        const plot = await plotFn(value, selectedWavelengthIndex);
        store.getState().setPlotImage(plot);
      }
    } catch {
      onError();
    } finally {
      store.getState().setPlotLoading(false);
    }
  }, [proxy, store, selectedPlotType, selectedWavelengthIndex, committedOpticalModel, onError]);

  const handleWavelengthChange = useCallback(async (value: number) => {
    store.getState().setSelectedWavelengthIndex(value);
    if (!proxy) return;
    if (!PLOT_TYPE_CONFIG[selectedPlotType].fieldDependent) return;
    store.getState().setPlotLoading(true);
    try {
      const plotFn = buildPlotFn(selectedPlotType, proxy, committedOpticalModel);
      if (plotFn) {
        const plot = await plotFn(selectedFieldIndex, value);
        store.getState().setPlotImage(plot);
      }
    } catch {
      onError();
    } finally {
      store.getState().setPlotLoading(false);
    }
  }, [proxy, store, selectedPlotType, selectedFieldIndex, committedOpticalModel, onError]);

  const handlePlotTypeChange = useCallback(async (plotType: PlotType) => {
    store.getState().setSelectedPlotType(plotType);
    if (!proxy) return;
    store.getState().setPlotLoading(true);
    try {
      const plotFn = buildPlotFn(plotType, proxy, committedOpticalModel);
      if (plotFn) {
        const plot = await plotFn(selectedFieldIndex, selectedWavelengthIndex);
        store.getState().setPlotImage(plot);
      }
    } catch {
      onError();
    } finally {
      store.getState().setPlotLoading(false);
    }
  }, [proxy, store, selectedFieldIndex, selectedWavelengthIndex, committedOpticalModel, onError]);

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
