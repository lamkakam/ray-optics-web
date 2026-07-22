"use client";
/**
 * Describes the Analysis Plot Container module.
 *
 * @remarks
 * ## State
 *
 * All analysis-plot state fields (reactive) are read from `useAnalysisPlotStore` and Zustand's `useStore(store, selector)`:
 * - `rayFanData`, `opdFanData`, `spotDiagramData`, `fieldCurvatureData`, `astigmatismCurveData`, `longitudinalSphericalAberrationData`, `geoPsfData`, `wavefrontMapData`, `strehlVsWavelengthData`, `diffractionPsfData`, `diffractionMtfData`, `plotLoading`, `selectedFieldIndex`, `selectedWavelengthIndex`, `selectedPlotType`.
 *
 * `committedOpticalModel` is read from `lensStore` via `useLensEditorStore` and `useStore(lensStore, (s) => s.committedOpticalModel)`.
 *
 * `seidelData` is read reactively from `useAnalysisDataStore()` and passed through to the view for `surfaceBySurface3rdOrder`.
 *
 * `committedSpecs` is subscribed from `specsStore` via `useSpecsConfiguratorStore` and `useStore(specsStore, (s) => s.committedSpecs)` (return value unused — subscription only) to trigger re-renders when the committed specs change.
 *
 * ## Derived Data
 *
 * - **`fieldOptions`** — options for the visible Half-Field selector, obtained by calling `specsStore.getState().getFieldOptions()` directly in the render body (re-evaluated on each render triggered by `committedSpecs` change). Unit is `°` for `"angle"`, ` mm` for `"height"`.
 * - **`wavelengthOptions`** — obtained by calling `specsStore.getState().getWavelengthOptions()` directly in the render body.
 *
 * ## Internal Logic
 *
 * All plot loading goes through `loadAnalysisPlot(...)` from `@/features/analysis/lib/plotFunctions`, which centralizes the plot-type to worker-API mapping. Plot-store-backed payload commits go through `commitAnalysisPlotResult(...)`, keeping panel behavior aligned with `LensEditor.tsx` submit handling and example-system application.
 *
 * The container also reads `imagePoint` from `ImagePointProvider` and passes it into `loadAnalysisPlot` so Ray Fan, OPD fan, spot diagram, wavefront map, Strehl vs wavelength, diffraction PSF, and diffraction MTF use the app-wide image reference convention.
 *
 * ### `loadPlot(plotType, fieldIndex, wavelengthIndex)`
 *
 * Shared async helper used by all three change handlers:
 *
 * 1. Returns immediately when `proxy` or `committedOpticalModel` is missing.
 * 2. Sets `plotLoading(true)`.
 * 3. Calls `loadAnalysisPlot({ plotType, proxy, model: committedOpticalModel, fieldIndex, wavelengthIndex, imagePoint })`.
 * 4. If the result kind is `"surfaceBySurface3rdOrder"`, updates only `analysisDataStore.seidelData.surfaceBySurface`.
 * 5. Otherwise delegates to `commitAnalysisPlotResult(...)`, which stores the payload with the matching analysis plot store setter.
 * 6. Calls `onError()` in `catch` and always clears `plotLoading` in `finally`.
 *
 * ### `handleFieldChange(value)`
 *
 * 1. Updates `selectedFieldIndex` in store.
 * 2. If `proxy` is undefined or `PLOT_TYPE_CONFIG[selectedPlotType].fieldDependent === false`, returns without plotting.
 * 3. Delegates to `loadPlot(selectedPlotType, value, selectedWavelengthIndex)`.
 *
 * ### `handleWavelengthChange(value)`
 *
 * Same pattern as `handleFieldChange` but updates `selectedWavelengthIndex` and delegates to `loadPlot(selectedPlotType, selectedFieldIndex, value)`. Only executes the plot call when `wavelengthDependent === true`, which includes field-independent field curvature and astigmatism curve plots.
 *
 * ### `handlePlotTypeChange(plotType)`
 *
 * 1. Updates `selectedPlotType` in store.
 * 2. If `proxy` is undefined, returns.
 * 3. Returns immediately for `surfaceBySurface3rdOrder`; the view reuses already-fetched `seidelData.surfaceBySurface` and does not refetch or use the legacy PNG path.
 * 4. Delegates to `loadPlot(plotType, selectedFieldIndex, selectedWavelengthIndex)` for the remaining plot types.
 *
 * ### Image-point refresh
 *
 * After the initial render, a change to the app-wide `imagePoint` refreshes the currently selected plot by calling `loadPlot(selectedPlotType, selectedFieldIndex, selectedWavelengthIndex)`. This uses the last committed optical model and does not run the full Update System workflow, so lens layout, first-order data, and non-selected analysis data are left unchanged. `surfaceBySurface3rdOrder` remains a no-op on image-point changes and continues to reuse existing Seidel data.
 */

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
