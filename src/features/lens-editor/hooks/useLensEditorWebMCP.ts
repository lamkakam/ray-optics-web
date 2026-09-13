"use client";

/** Composition hook that registers all eleven imperative Lens Editor WebMCP tools. */
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
}

/** Registers prescription, System Specs, recomputation, and focus tools in order. */
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
  ]);
}
