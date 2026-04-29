import type { StoreApi } from "zustand";
import type { LensEditorState } from "@/features/lens-editor/stores/lensEditorStore";
import type { SpecsConfiguratorState } from "@/features/lens-editor/stores/specsConfiguratorStore";
import { surfacesToGridRows } from "@/shared/lib/lens-prescription-grid/lib/gridTransform";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";

interface ApplyOptimizationModelToEditorParams {
  readonly model: OpticalModel;
  readonly lensStore: StoreApi<LensEditorState>;
  readonly specsStore: StoreApi<SpecsConfiguratorState>;
}

export function applyOptimizationModelToEditor({
  model,
  lensStore,
  specsStore,
}: ApplyOptimizationModelToEditorParams) {
  specsStore.getState().loadFromSpecs(model.specs);
  specsStore.getState().setCommittedSpecs(model.specs);
  lensStore.getState().setRows(surfacesToGridRows(model), {
    optimizationSyncPolicy: "preserveOptimizationModes",
  });
  lensStore.getState().setAutoAperture(model.setAutoAperture === "autoAperture");
  lensStore.getState().setCommittedOpticalModel(model);
}
