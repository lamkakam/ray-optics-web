"use client";

import React, { useCallback } from "react";
import { useStore } from "zustand";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import type { DiffractionPsfData, WavefrontMapData } from "@/shared/lib/types/opticalModel";
import { useSpecsConfiguratorStore } from "@/features/lens-editor/providers/SpecsConfiguratorStoreProvider";
import { useLensEditorStore } from "@/features/lens-editor/providers/LensEditorStoreProvider";
import { useAnalysisPlotStore } from "@/features/analysis/providers/AnalysisPlotStoreProvider";
import { buildPlotFn } from "@/shared/lib/utils/plotFunctions";
import {
  AnalysisPlotView,
  PLOT_TYPE_CONFIG,
  type PlotType,
} from "@/features/analysis/components/AnalysisPlotView";


interface AnalysisPlotContainerProps {
  readonly proxy: PyodideWorkerAPI | undefined;
  readonly onError: () => void;
  readonly autoHeight?: boolean;
}

export function AnalysisPlotContainer({
  proxy,
  onError,
  autoHeight,
}: AnalysisPlotContainerProps) {
  const lensStore = useLensEditorStore();
  const committedOpticalModel = useStore(lensStore, (s) => s.committedOpticalModel);

  const store = useAnalysisPlotStore();
  const plotImage = useStore(store, (s) => s.plotImage);
  const diffractionPsfData = useStore(store, (s) => s.diffractionPsfData);
  const wavefrontMapData = useStore(store, (s) => s.wavefrontMapData);
  const plotLoading = useStore(store, (s) => s.plotLoading);
  const selectedFieldIndex = useStore(store, (s) => s.selectedFieldIndex);
  const selectedWavelengthIndex = useStore(store, (s) => s.selectedWavelengthIndex);
  const selectedPlotType = useStore(store, (s) => s.selectedPlotType);

  const specsStore = useSpecsConfiguratorStore();
  useStore(specsStore, (s) => s.committedSpecs);
  const fieldOptions = specsStore.getState().getFieldOptions();
  const wavelengthOptions = specsStore.getState().getWavelengthOptions();

  const loadPlot = useCallback(async (
    plotType: PlotType,
    fieldIndex: number,
    wavelengthIndex: number,
  ) => {
    if (!proxy || !committedOpticalModel) return;

    store.getState().setPlotLoading(true);
    try {
      if (plotType === "diffractionPSF") {
        const diffractionData: DiffractionPsfData = await proxy.getDiffractionPSFData(
          committedOpticalModel,
          fieldIndex,
          wavelengthIndex,
        );
        store.getState().setDiffractionPsfData(diffractionData);
        return;
      }

      if (plotType === "wavefrontMap") {
        const wavefrontData: WavefrontMapData = await proxy.getWavefrontData(
          committedOpticalModel,
          fieldIndex,
          wavelengthIndex,
        );
        store.getState().setWavefrontMapData(wavefrontData);
        return;
      }

      const plotFn = buildPlotFn(plotType, proxy, committedOpticalModel);
      if (plotFn) {
        const plot = await plotFn(fieldIndex, wavelengthIndex);
        store.getState().setPlotImage(plot);
      }
    } catch {
      onError();
    } finally {
      store.getState().setPlotLoading(false);
    }
  }, [proxy, committedOpticalModel, store, onError]);

  const handleFieldChange = useCallback(async (value: number) => {
    store.getState().setSelectedFieldIndex(value);
    if (!proxy) return;
    if (!PLOT_TYPE_CONFIG[selectedPlotType].fieldDependent) return;
    await loadPlot(selectedPlotType, value, selectedWavelengthIndex);
  }, [proxy, store, selectedPlotType, selectedWavelengthIndex, loadPlot]);

  const handleWavelengthChange = useCallback(async (value: number) => {
    store.getState().setSelectedWavelengthIndex(value);
    if (!proxy) return;
    if (!PLOT_TYPE_CONFIG[selectedPlotType].fieldDependent) return;
    await loadPlot(selectedPlotType, selectedFieldIndex, value);
  }, [proxy, store, selectedPlotType, selectedFieldIndex, loadPlot]);

  const handlePlotTypeChange = useCallback(async (plotType: PlotType) => {
    store.getState().setSelectedPlotType(plotType);
    if (!proxy) return;
    await loadPlot(plotType, selectedFieldIndex, selectedWavelengthIndex);
  }, [proxy, store, selectedFieldIndex, selectedWavelengthIndex, loadPlot]);

  return (
    <AnalysisPlotView
      fieldOptions={fieldOptions}
      wavelengthOptions={wavelengthOptions}
      selectedFieldIndex={selectedFieldIndex}
      selectedWavelengthIndex={selectedWavelengthIndex}
      selectedPlotType={selectedPlotType}
      plotImageBase64={plotImage}
      diffractionPsfData={diffractionPsfData}
      wavefrontMapData={wavefrontMapData}
      loading={plotLoading}
      onFieldChange={handleFieldChange}
      onWavelengthChange={handleWavelengthChange}
      onPlotTypeChange={handlePlotTypeChange}
      autoHeight={autoHeight}
    />
  );
}
