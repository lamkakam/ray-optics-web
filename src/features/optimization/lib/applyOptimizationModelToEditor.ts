/**
# `features/optimization/lib/applyOptimizationModelToEditor.ts`

## Export

- `applyOptimizationModelToEditor({ model, lensStore, specsStore, proxy })` fetches and validates fresh auto-aperture semi-diameters before atomically writing editor state. Manual models bypass extraction and clear the cache; fetch failures leave the editor unchanged.

## Consumers

- `features/optimization/OptimizationPage.tsx`
- `app/AppShell.tsx`
*/
import type { StoreApi } from "zustand";
import type { LensEditorState } from "@/features/lens-editor/stores/lensEditorStore";
import type { SpecsConfiguratorState } from "@/features/lens-editor/stores/specsConfiguratorStore";
import { surfacesToGridRows } from "@/shared/lib/lens-prescription-grid/lib/gridTransform";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import { mapPhysicalSurfaceSemiDiameters } from "@/features/lens-editor/lib/autoSemiDiameters";

interface ApplyOptimizationModelToEditorParams {
  readonly model: OpticalModel;
  readonly lensStore: StoreApi<LensEditorState>;
  readonly specsStore: StoreApi<SpecsConfiguratorState>;
  readonly proxy: Pick<PyodideWorkerAPI, "getSurfaceSemiDiameters">;
}

/**
## Purpose

Shared helper that applies an optimization-local optical model snapshot back to the lens editor stores.

## Behavior

- Loads and commits `model.specs` through `SpecsConfiguratorState`.
- Converts `model` surfaces to prescription grid rows with `surfacesToGridRows()`.
- Calls `LensEditorState.setRows()` with `optimizationSyncPolicy: "preserveOptimizationModes"` so the Optimization store can sync the applied model without discarding compatible optimization variable/pickup settings.
- Mirrors `model.setAutoAperture` into the editor auto-aperture flag.
- Commits the full optical model in the lens editor store.
*/
export async function applyOptimizationModelToEditor({
  model,
  lensStore,
  specsStore,
  proxy,
}: ApplyOptimizationModelToEditorParams): Promise<void> {
  const rows = surfacesToGridRows(model);
  const autoSemiDiameters = model.setAutoAperture === "autoAperture"
    ? mapPhysicalSurfaceSemiDiameters(rows, await proxy.getSurfaceSemiDiameters(model))
    : {};

  specsStore.getState().loadFromSpecs(model.specs);
  specsStore.getState().setCommittedSpecs(model.specs);
  lensStore.getState().setRows(rows, {
    optimizationSyncPolicy: "preserveOptimizationModes",
  });
  lensStore.getState().setAutoAperture(model.setAutoAperture === "autoAperture");
  lensStore.getState().setCommittedOpticalModel(model);
  lensStore.getState().setAutoSemiDiameters(autoSemiDiameters);
}
