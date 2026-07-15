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
