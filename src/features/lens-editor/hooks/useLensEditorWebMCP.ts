"use client";

/** Composition hook that registers all eleven imperative Lens Editor WebMCP tools and forwards focus/computation lifecycle callbacks to the editor. */
import { useMemo } from "react";
import type { StoreApi } from "zustand";
import type { GlassLookupMaps } from "@/features/glass-map/types/glassMap";
import type { AnalysisDataState } from "@/features/analysis/stores/analysisDataStore";
import type { AnalysisPlotState } from "@/features/analysis/stores/analysisPlotStore";
import type { LensLayoutImageState } from "@/features/analysis/stores/lensLayoutImageStore";
import type { LensEditorState } from "@/features/lens-editor/stores/lensEditorStore";
import type { SpecsConfiguratorState } from "@/features/lens-editor/stores/specsConfiguratorStore";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import type { ImagePoint } from "@/shared/components/providers/ImagePointProvider";
import { createLensPrescriptionTools } from "@/features/lens-editor/lib/lensPrescriptionWebMcp";
import { createSystemSpecsTools } from "@/features/lens-editor/lib/systemSpecsWebMcp";
import { createOpticalSystemTools } from "@/features/lens-editor/lib/opticalSystemWebMcp";
import { useWebMCP } from "@/shared/hooks/useWebMCP";

/** Provider-backed dependencies for the complete Lens Editor WebMCP surface. */
export interface LensEditorWebMCPDependencies {
  readonly lensStore: StoreApi<LensEditorState>;
  readonly specsStore: StoreApi<SpecsConfiguratorState>;
  readonly analysisPlotStore: StoreApi<AnalysisPlotState>;
  readonly analysisDataStore: StoreApi<AnalysisDataState>;
  readonly lensLayoutImageStore: StoreApi<LensLayoutImageState>;
  readonly lookupMaps: GlassLookupMaps | undefined;
  readonly proxy: PyodideWorkerAPI | undefined;
  readonly isDark: boolean;
  readonly imagePoint?: ImagePoint;
  /** Starts the Lens Editor-level focus overlay lifecycle. */
  readonly onFocusStart?: () => void;
  /** Ends the Lens Editor-level focus overlay lifecycle. */
  readonly onFocusEnd?: () => void;
  /** Starts the Update System computation lifecycle. */
  readonly onComputationStart?: () => void;
  /** Ends the Update System computation lifecycle. */
  readonly onComputationEnd?: () => void;
  /** Routes focus failures to the editor's error UI. */
  readonly onError?: (error: unknown) => void;
}

/** Registers prescription, System Specs, recomputation, and focus tools in order. The focus descriptor uses the supplied lifecycle callbacks while it dispatches and recomputes, and forwards failures to the supplied error callback. */
export function useLensEditorWebMCP({
  lensStore,
  specsStore,
  analysisPlotStore,
  analysisDataStore,
  lensLayoutImageStore,
  lookupMaps,
  proxy,
  isDark,
  imagePoint,
  onFocusStart,
  onFocusEnd,
  onComputationStart,
  onComputationEnd,
  onError,
}: LensEditorWebMCPDependencies): void {
  const prescriptionTools = useMemo(
    () => createLensPrescriptionTools(lensStore, lookupMaps),
    [lensStore, lookupMaps],
  );
  const systemSpecsTools = useMemo(
    () => createSystemSpecsTools(specsStore),
    [specsStore],
  );
  const opticalSystemTools = useMemo(
    () =>
      createOpticalSystemTools({
        proxy,
        lensStore,
        specsStore,
        analysisPlotStore,
        analysisDataStore,
        lensLayoutImageStore,
        lookupMaps,
        isDark,
        imagePoint,
        onFocusStart,
        onFocusEnd,
        onComputationStart,
        onComputationEnd,
        onError,
      }),
    [
      proxy,
      lensStore,
      specsStore,
      analysisPlotStore,
      analysisDataStore,
      lensLayoutImageStore,
      lookupMaps,
      isDark,
      imagePoint,
      onFocusStart,
      onFocusEnd,
      onComputationStart,
      onComputationEnd,
      onError,
    ],
  );

  useWebMCP(prescriptionTools.getLensPrescription, [lensStore]);
  useWebMCP(prescriptionTools.setLensPrescription, [lensStore]);
  useWebMCP(prescriptionTools.insertLensSurface, [lensStore]);
  useWebMCP(prescriptionTools.updateLensRow, [lensStore]);
  useWebMCP(prescriptionTools.deleteLensSurface, [lensStore]);
  useWebMCP(systemSpecsTools.getSystemSpecs, [specsStore]);
  useWebMCP(systemSpecsTools.setSystemAperture, [specsStore]);
  useWebMCP(systemSpecsTools.setHalfField, [specsStore]);
  useWebMCP(systemSpecsTools.setWavelengths, [specsStore]);
  useWebMCP(opticalSystemTools.recomputeOpticalSystem, [
    lensStore,
    specsStore,
    analysisPlotStore,
    analysisDataStore,
    lensLayoutImageStore,
  ]);
  useWebMCP(opticalSystemTools.focusOpticalSystem, [
    lensStore,
    specsStore,
    analysisPlotStore,
    analysisDataStore,
    lensLayoutImageStore,
    onFocusStart,
    onFocusEnd,
    onComputationStart,
    onComputationEnd,
    onError,
  ]);
}
