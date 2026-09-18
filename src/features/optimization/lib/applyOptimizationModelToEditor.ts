/** Shared editor-application path used by the Optimization page and guarded app navigation. */
import type { StoreApi } from "zustand";
import type { LensEditorState } from "@/features/lens-editor/stores/lensEditorStore";
import type { SpecsConfiguratorState } from "@/features/lens-editor/stores/specsConfiguratorStore";
import { surfacesToGridRows } from "@/shared/lib/lens-prescription-grid/lib/gridTransform";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import { mapPhysicalSurfaceSemiDiameters } from "@/features/lens-editor/lib/autoSemiDiameters";
import { assertWebMcpNotCancelled } from "@/shared/lib/webMcpValidation";

interface ApplyOptimizationModelToEditorParams {
  readonly model: OpticalModel;
  readonly lensStore: StoreApi<LensEditorState>;
  readonly specsStore: StoreApi<SpecsConfiguratorState>;
  readonly proxy: Pick<PyodideWorkerAPI, "getSurfaceSemiDiameters">;
  /** Cancels a pending application before its synchronous store commit begins. */
  readonly signal?: AbortSignal;
}

/**
 * Shared helper that applies an optimization-local optical model snapshot back to the lens editor stores.
 *
 * @remarks
 * ## Behavior
 *
 * - Checks cancellation at entry and after aperture extraction, immediately before the first store mutation. Cancellation rejects with `AbortError` and leaves both stores unchanged; it does not interrupt the worker request or roll back a completed commit.
 * - Loads and commits `model.specs` through `SpecsConfiguratorState`.
 * - Converts `model` surfaces to prescription grid rows with `surfacesToGridRows()`.
 * - Calls `LensEditorState.setRows()` with `optimizationSyncPolicy: "preserveOptimizationModes"` so the Optimization store can sync the applied model without discarding compatible optimization variable/pickup settings.
 * - Mirrors `model.setAutoAperture` into the editor auto-aperture flag.
 * - Commits the full optical model in the lens editor store.
 */
export async function applyOptimizationModelToEditor({
  model,
  lensStore,
  specsStore,
  proxy,
  signal,
}: ApplyOptimizationModelToEditorParams): Promise<void> {
  assertWebMcpNotCancelled(signal);
  const rows = surfacesToGridRows(model);
  const autoSemiDiameters =
    model.setAutoAperture === "autoAperture"
      ? mapPhysicalSurfaceSemiDiameters(
          rows,
          await proxy.getSurfaceSemiDiameters(model),
        )
      : {};

  assertWebMcpNotCancelled(signal);
  specsStore.getState().loadFromSpecs(model.specs);
  specsStore.getState().setCommittedSpecs(model.specs);
  lensStore.getState().setRows(rows, {
    optimizationSyncPolicy: "preserveOptimizationModes",
  });
  lensStore
    .getState()
    .setAutoAperture(model.setAutoAperture === "autoAperture");
  lensStore.getState().setCommittedOpticalModel(model);
  lensStore.getState().setAutoSemiDiameters(autoSemiDiameters);
}
