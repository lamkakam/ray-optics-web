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
  /** Pyodide worker proxy; handlers no-op if `undefined` */
  readonly proxy: PyodideWorkerAPI | undefined;
  /** Called when any async plot call throws */
  readonly onError: () => void;
  /** Forwarded to `AnalysisPlotView` */
  readonly autoHeight?: boolean;
}

/**
 * Container component that owns all analysis-plot logic: derives Half-Field/wavelength select options, resolves the correct worker API for each plot type, and handles user-driven field, wavelength, and plot-type changes. Renders `AnalysisPlotView` as its presentational child and feeds typed surface-by-surface Seidel data, typed Ray-Fan data, typed OPD-fan data, typed spot-diagram point data, typed field-curvature data, typed astigmatism-curve data, typed longitudinal-spherical-aberration data, typed geometric-PSF point data, typed wavefront-map grid data, typed Strehl-vs-wavelength line data, typed diffraction-PSF grid data, or typed diffraction-MTF line data depending on the selected plot type.
 *
 * @remarks
 * - Used in `LensEditor.tsx`. The container pulls the relevant stores from their providers and only receives `proxy`, `onError`, and `autoHeight` as props.
 *
 *
 * Analysis-plot orchestration shared by user-driven selector changes and image-point refreshes.
 * Plot loading and store commits use the same centralized helpers as the editor submit flow.
 */
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
  /** Half-field options recomputed whenever the subscribed committed specs change. */
  const fieldOptions = specsStore.getState().getFieldOptions();
  /** Wavelength options recomputed whenever the subscribed committed specs change. */
  const wavelengthOptions = specsStore.getState().getWavelengthOptions();

  /**
   * Loads and commits one analysis result for the committed optical model.
   * Surface-by-surface data is merged into Seidel state; all other payloads use
   * the matching analysis-plot store setter.
   */
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

  /** Stores a field selection and reloads only field-dependent plots. */
  const handleFieldChange = useCallback(async (value: number) => {
    store.getState().setSelectedFieldIndex(value);
    if (!proxy) return;
    if (!PLOT_TYPE_CONFIG[selectedPlotType].fieldDependent) return;
    await loadPlot(selectedPlotType, value, selectedWavelengthIndex);
  }, [proxy, store, selectedPlotType, selectedWavelengthIndex, loadPlot]);

  /** Stores a wavelength selection and reloads only wavelength-dependent plots. */
  const handleWavelengthChange = useCallback(async (value: number) => {
    store.getState().setSelectedWavelengthIndex(value);
    if (!proxy) return;
    if (!PLOT_TYPE_CONFIG[selectedPlotType].wavelengthDependent) return;
    await loadPlot(selectedPlotType, selectedFieldIndex, value);
  }, [proxy, store, selectedPlotType, selectedFieldIndex, loadPlot]);

  /** Stores a plot-type selection and loads it unless existing Seidel data is reused. */
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
