"use client";

import { useCallback, useEffect, useRef } from "react";
import { useStore } from "zustand";
import { useAnalysisDataStore } from "@/features/analysis/providers/AnalysisDataStoreProvider";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import { useSpecsConfiguratorStore } from "@/features/lens-editor/providers/SpecsConfiguratorStoreProvider";
import { useLensEditorStore } from "@/features/lens-editor/providers/LensEditorStoreProvider";
import { useAnalysisPlotStore } from "@/features/analysis/providers/AnalysisPlotStoreProvider";
import {
  commitAnalysisPlotResult,
  loadAnalysisPlot,
  loadSeidelData,
} from "@/features/analysis/lib/plotFunctions";
import {
  AnalysisPlotView,
  PLOT_TYPE_CONFIG,
  type PlotType,
} from "@/features/analysis/components/AnalysisPlotView";
import { ANALYSIS_RAY_COUNT_SETTINGS } from "@/features/analysis/lib/analysisRayCounts";
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
 * All active plots load through the cache on mount, except Seidel, which reuses the analysis-data store. Remounts subscribe to pending or completed calculations and finish their own loading lifecycle; rejected calculations retry. Configurable plots also reload on resolution changes, including return from Settings. Only the latest mounted request may commit data, errors, or loading state. Irrelevant selector and preference changes do not reload the active plot.
 * Plot loading and store commits use the same centralized cached helpers as the editor submit flow. Cached results are still committed through the matching Zustand setter whenever a plot is selected again.
 */
export function AnalysisPlotContainer({
  proxy,
  onError,
  autoHeight,
}: AnalysisPlotContainerProps) {
  const lensStore = useLensEditorStore();
  const committedOpticalModel = useStore(
    lensStore,
    (s) => s.committedOpticalModel,
  );
  const analysisDataStore = useAnalysisDataStore();
  const seidelData = useStore(analysisDataStore, (s) => s.seidelData);

  const store = useAnalysisPlotStore();
  const { imagePoint } = useImagePoint();
  const rayFanData = useStore(store, (s) => s.rayFanData);
  const opdFanData = useStore(store, (s) => s.opdFanData);
  const spotDiagramData = useStore(store, (s) => s.spotDiagramData);
  const fieldCurvatureData = useStore(store, (s) => s.fieldCurvatureData);
  const astigmatismCurveData = useStore(store, (s) => s.astigmatismCurveData);
  const longitudinalSphericalAberrationData = useStore(
    store,
    (s) => s.longitudinalSphericalAberrationData,
  );
  const geoPsfData = useStore(store, (s) => s.geoPsfData);
  const diffractionPsfData = useStore(store, (s) => s.diffractionPsfData);
  const diffractionMtfData = useStore(store, (s) => s.diffractionMtfData);
  const wavefrontMapData = useStore(store, (s) => s.wavefrontMapData);
  const strehlVsWavelengthData = useStore(
    store,
    (s) => s.strehlVsWavelengthData,
  );
  const plotLoading = useStore(store, (s) => s.plotLoading);
  const selectedFieldIndex = useStore(store, (s) => s.selectedFieldIndex);
  const selectedWavelengthIndex = useStore(
    store,
    (s) => s.selectedWavelengthIndex,
  );
  const selectedPlotType = useStore(store, (s) => s.selectedPlotType);
  const configurablePlot = ANALYSIS_RAY_COUNT_SETTINGS.find(
    (setting) => setting.plotType === selectedPlotType,
  )?.plotType;
  const selectedRayCount = useStore(store, (s) =>
    configurablePlot === undefined ? undefined : s.rayCounts[configurablePlot],
  );
  const requestIdRef = useRef(0);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const specsStore = useSpecsConfiguratorStore();
  useStore(specsStore, (s) => s.committedSpecs);
  /** Half-field options recomputed whenever the subscribed committed specs change. */
  const fieldOptions = specsStore.getState().getFieldOptions();
  /** Wavelength options recomputed whenever the subscribed committed specs change. */
  const wavelengthOptions = specsStore.getState().getWavelengthOptions();

  /**
   * Loads and commits one analysis result for the committed optical model.
   * Seidel refreshes store the complete cached payload and its exact source
   * model together, avoiding mixed-model results. All other payloads use the
   * matching analysis-plot store setter, guarded by request, model, selection, and resolution ownership.
   */
  const loadPlot = useCallback(
    async (plotType: PlotType, fieldIndex: number, wavelengthIndex: number) => {
      if (!proxy || !committedOpticalModel) return;

      const requestId = ++requestIdRef.current;
      const rayCounts = store.getState().rayCounts;
      const configurable = ANALYSIS_RAY_COUNT_SETTINGS.find(
        (setting) => setting.plotType === plotType,
      )?.plotType;
      const isCurrent = () => {
        const state = store.getState();
        return (
          requestId === requestIdRef.current &&
          lensStore.getState().committedOpticalModel ===
            committedOpticalModel &&
          state.selectedPlotType === plotType &&
          (!PLOT_TYPE_CONFIG[plotType].fieldDependent ||
            state.selectedFieldIndex === fieldIndex) &&
          (!PLOT_TYPE_CONFIG[plotType].wavelengthDependent ||
            state.selectedWavelengthIndex === wavelengthIndex) &&
          (configurable === undefined ||
            state.rayCounts[configurable] === rayCounts[configurable])
        );
      };
      store.getState().setPlotLoading(true);
      try {
        const result = await loadAnalysisPlot({
          plotType,
          proxy,
          model: committedOpticalModel,
          fieldIndex,
          wavelengthIndex,
          imagePoint,
          rayCounts,
        });
        if (!result || !isCurrent()) return;

        if (result.kind === "surfaceBySurface3rdOrder") {
          const data = await loadSeidelData({
            proxy,
            model: committedOpticalModel,
            imagePoint,
          });
          if (!isCurrent()) return;
          analysisDataStore
            .getState()
            .setSeidelData(data, committedOpticalModel);
          return;
        }

        commitAnalysisPlotResult(result, store);
      } catch {
        if (isCurrent()) onErrorRef.current();
      } finally {
        if (isCurrent()) store.getState().setPlotLoading(false);
      }
    },
    [
      proxy,
      committedOpticalModel,
      store,
      lensStore,
      analysisDataStore,
      imagePoint,
    ],
  );

  /** Stores the field selection; the effect reloads field-dependent plots and discards superseded requests. */
  const handleFieldChange = useCallback(
    (value: number) => {
      store.getState().setSelectedFieldIndex(value);
    },
    [store],
  );
  /** Stores the wavelength selection; the effect reloads only wavelength-dependent plots. */
  const handleWavelengthChange = useCallback(
    (value: number) => {
      store.getState().setSelectedWavelengthIndex(value);
    },
    [store],
  );
  /** Stores the plot selection; the effect reloads it or reuses existing Seidel data. */
  const handlePlotTypeChange = useCallback(
    (plotType: PlotType) => {
      store.getState().setSelectedPlotType(plotType);
    },
    [store],
  );

  const effectiveFieldIndex = PLOT_TYPE_CONFIG[selectedPlotType].fieldDependent
    ? selectedFieldIndex
    : 0;
  const effectiveWavelengthIndex = PLOT_TYPE_CONFIG[selectedPlotType]
    .wavelengthDependent
    ? selectedWavelengthIndex
    : 0;
  // biome-ignore lint/correctness/useExhaustiveDependencies: selectedRayCount triggers reloads; loadPlot reads the current ray-count snapshot from the store.
  useEffect(() => {
    if (selectedPlotType === "surfaceBySurface3rdOrder") {
      store.getState().setPlotLoading(false);
      return;
    }
    void loadPlot(
      selectedPlotType,
      effectiveFieldIndex,
      effectiveWavelengthIndex,
    );
    return () => {
      requestIdRef.current += 1;
    };
  }, [
    selectedPlotType,
    effectiveFieldIndex,
    effectiveWavelengthIndex,
    selectedRayCount,
    loadPlot,
    store,
  ]);

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
