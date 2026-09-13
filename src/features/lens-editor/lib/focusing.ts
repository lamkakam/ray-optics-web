/** Shared worker dispatch and final-image-gap mutation used by UI and WebMCP focus flows. */
import type { StoreApi } from "zustand";
import type { LensEditorState } from "@/features/lens-editor/stores/lensEditorStore";
import type { FocusingResult } from "@/features/lens-editor/types/focusingResult";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";

/** Focusing chromaticity choices exposed by the Lens Editor. */
export type FocusingChromaticity = "mono" | "poly";
/** Focusing merit-function choices exposed by the Lens Editor. */
export type FocusingMetric = "rmsSpot" | "wavefront";

/** Parameters selecting one of the four unchanged worker focus APIs. */
export interface FocusingDispatchOptions {
  readonly chromaticity: FocusingChromaticity;
  readonly metric: FocusingMetric;
  readonly fieldIndex: number;
}

/** Dispatches a focusing request to the worker method matching both choices. */
export function dispatchFocusing(
  proxy: PyodideWorkerAPI,
  model: OpticalModel,
  { chromaticity, metric, fieldIndex }: FocusingDispatchOptions,
): Promise<FocusingResult> {
  if (chromaticity === "mono" && metric === "rmsSpot") {
    return proxy.focusByMonoRmsSpot(model, fieldIndex);
  }
  if (chromaticity === "mono" && metric === "wavefront") {
    return proxy.focusByMonoStrehl(model, fieldIndex);
  }
  if (chromaticity === "poly" && metric === "rmsSpot") {
    return proxy.focusByPolyRmsSpot(model, fieldIndex);
  }
  return proxy.focusByPolyStrehl(model, fieldIndex);
}

/**
 * Applies a worker delta to the last physical surface and returns the resulting
 * image-space thickness. Optimization prescription modes are intentionally kept.
 */
export function applyFocusingDelta(
  store: StoreApi<LensEditorState>,
  result: FocusingResult,
): number {
  if (!Number.isFinite(result.delta_thi)) {
    throw new Error("Focusing returned a non-finite thickness delta");
  }

  const rows = store.getState().rows;
  const lastSurface = [...rows].reverse().find((row) => row.kind === "surface");
  if (lastSurface === undefined || lastSurface.kind !== "surface") {
    throw new Error("Cannot focus a system without an optical surface");
  }

  const imageSpaceThickness = lastSurface.thickness + result.delta_thi;
  if (!Number.isFinite(imageSpaceThickness)) {
    throw new Error("Focusing produced a non-finite image-space thickness");
  }
  store
    .getState()
    .updateRow(
      lastSurface.id,
      { thickness: imageSpaceThickness },
      { optimizationSyncPolicy: "preserveOptimizationModes" },
    );
  return imageSpaceThickness;
}
