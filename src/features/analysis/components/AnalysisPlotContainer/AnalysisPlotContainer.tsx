"use client";

import { useCallback, useEffect, useRef } from "react";
import { useStore } from "zustand";
import { useAnalysisDataStore } from "@/features/analysis/providers/AnalysisDataStoreProvider";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import { useSpecsConfiguratorStore } from "@/features/lens-editor/providers/SpecsConfiguratorStoreProvider";
import { useLensEditorStore } from "@/features/lens-editor/providers/LensEditorStoreProvider";
import { useAnalysisPlotStore } from "@/features/analysis/providers/AnalysisPlotStoreProvider";
import { commitAnalysisPlotResult, loadAnalysisPlot } from "@/features/analysis/lib/plotFunctions";
import {
  AnalysisPlotView,
  PLOT_TYPE_CONFIG,
  type PlotType,
} from "@/features/analysis/components/AnalysisPlotView";
import { useImagePoint } from "@/shared/components/providers/ImagePointProvider";


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
  const analysisDataStore = useAnalysisDataStore();
  const seidelData = useStore(analysisDataStore, (s) => s.seidelData);

  const store = useAnalysisPlotStore();
  const { imagePoint } = useImagePoint();
  const rayFanData = useStore(store, (s) => s.rayFanData);
  const opdFanData = useStore(store, (s) => s.opdFanData);
  const spotDiagramData = useStore(store, (s) => s.spotDiagramData);
  const fieldCurvatureData = useStore(store, (s) => s.fieldCurvatureData);
  const astigmatismCurveData = useStore(store, (s) => s.astigmatismCurveData);
  const longitudinalSphericalAberrationData = useStore(store, (s) => s.longitudinalSphericalAberrationData);
  const geoPsfData = useStore(store, (s) => s.geoPsfData);
  const diffractionPsfData = useStore(store, (s) => s.diffractionPsfData);
  const diffractionMtfData = useStore(store, (s) => s.diffractionMtfData);
  const wavefrontMapData = useStore(store, (s) => s.wavefrontMapData);
  const strehlVsWavelengthData = useStore(store, (s) => s.strehlVsWavelengthData);
  const plotLoading = useStore(store, (s) => s.plotLoading);
  const selectedFieldIndex = useStore(store, (s) => s.selectedFieldIndex);
  const selectedWavelengthIndex = useStore(store, (s) => s.selectedWavelengthIndex);
  const selectedPlotType = useStore(store, (s) => s.selectedPlotType);
  const hasMountedRef = useRef(false);
  const previousImagePointRef = useRef(imagePoint);

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
      const result = await loadAnalysisPlot({
        plotType,
        proxy,
        model: committedOpticalModel,
        fieldIndex,
        wavelengthIndex,
        imagePoint,
      });
      if (!result) return;

      if (result.kind === "surfaceBySurface3rdOrder") {
        const existingSeidelData = analysisDataStore.getState().seidelData;
        analysisDataStore.getState().setSeidelData({
          transverse: existingSeidelData?.transverse ?? {},
          wavefront: existingSeidelData?.wavefront ?? {},
          curvature: existingSeidelData?.curvature ?? {},
          surfaceBySurface: result.surfaceBySurface3rdOrderData,
        });
        return;
      }

      commitAnalysisPlotResult(result, store);
    } catch {
      onError();
    } finally {
      store.getState().setPlotLoading(false);
    }
  }, [proxy, committedOpticalModel, store, onError, analysisDataStore, imagePoint]);

  const handleFieldChange = useCallback(async (value: number) => {
    store.getState().setSelectedFieldIndex(value);
    if (!proxy) return;
    if (!PLOT_TYPE_CONFIG[selectedPlotType].fieldDependent) return;
    await loadPlot(selectedPlotType, value, selectedWavelengthIndex);
  }, [proxy, store, selectedPlotType, selectedWavelengthIndex, loadPlot]);

  const handleWavelengthChange = useCallback(async (value: number) => {
    store.getState().setSelectedWavelengthIndex(value);
    if (!proxy) return;
    if (!PLOT_TYPE_CONFIG[selectedPlotType].wavelengthDependent) return;
    await loadPlot(selectedPlotType, selectedFieldIndex, value);
  }, [proxy, store, selectedPlotType, selectedFieldIndex, loadPlot]);

  const handlePlotTypeChange = useCallback(async (plotType: PlotType) => {
    store.getState().setSelectedPlotType(plotType);
    if (!proxy) return;
    if (plotType === "surfaceBySurface3rdOrder") return;
    await loadPlot(plotType, selectedFieldIndex, selectedWavelengthIndex);
  }, [proxy, store, selectedFieldIndex, selectedWavelengthIndex, loadPlot]);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      previousImagePointRef.current = imagePoint;
      return;
    }
    if (previousImagePointRef.current === imagePoint) return;
    previousImagePointRef.current = imagePoint;
    if (selectedPlotType === "surfaceBySurface3rdOrder") return;
    void loadPlot(selectedPlotType, selectedFieldIndex, selectedWavelengthIndex);
  }, [imagePoint, selectedPlotType, selectedFieldIndex, selectedWavelengthIndex, loadPlot]);

  return (
    <AnalysisPlotView
      fieldOptions={fieldOptions}
      wavelengthOptions={wavelengthOptions}
      selectedFieldIndex={selectedFieldIndex}
      selectedWavelengthIndex={selectedWavelengthIndex}
      selectedPlotType={selectedPlotType}
      surfaceBySurface3rdOrderData={seidelData?.surfaceBySurface}
      rayFanData={rayFanData}
      opdFanData={opdFanData}
      spotDiagramData={spotDiagramData}
      fieldCurvatureData={fieldCurvatureData}
      astigmatismCurveData={astigmatismCurveData}
      longitudinalSphericalAberrationData={longitudinalSphericalAberrationData}
      geoPsfData={geoPsfData}
      diffractionPsfData={diffractionPsfData}
      diffractionMtfData={diffractionMtfData}
      wavefrontMapData={wavefrontMapData}
      strehlVsWavelengthData={strehlVsWavelengthData}
      loading={plotLoading}
      onFieldChange={handleFieldChange}
      onWavelengthChange={handleWavelengthChange}
      onPlotTypeChange={handlePlotTypeChange}
      autoHeight={autoHeight}
    />
  );
}
