import { createStore } from "zustand/vanilla";
import { createLensEditorSlice, type LensEditorState } from "@/features/lens-editor/stores/lensEditorStore";
import { createSpecsConfiguratorSlice, type SpecsConfiguratorState } from "@/features/lens-editor/stores/specsConfiguratorStore";
import { applyOptimizationModelToEditor } from "@/features/optimization/lib/applyOptimizationModelToEditor";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";

const model: OpticalModel = {
  setAutoAperture: "autoAperture",
  object: { distance: 1e10, medium: "air", manufacturer: "" },
  image: { curvatureRadius: 0 },
  surfaces: [{ label: "Default", curvatureRadius: 20, thickness: 2, medium: "air", manufacturer: "", semiDiameter: 5 }],
  specs: {
    pupil: { space: "object", type: "epd", value: 10 },
    field: { space: "object", type: "angle", maxField: 1, fields: [0, 1], isRelative: true },
    wavelengths: { weights: [[587.6, 1]], referenceIndex: 0 },
  },
};

function stores() {
  return {
    lensStore: createStore<LensEditorState>(createLensEditorSlice),
    specsStore: createStore<SpecsConfiguratorState>(createSpecsConfiguratorSlice),
  };
}

describe("applyOptimizationModelToEditor", () => {
  it("fetches auto values before atomically applying the model", async () => {
    const { lensStore, specsStore } = stores();
    const proxy = { getSurfaceSemiDiameters: jest.fn().mockResolvedValue([100, 6.25, 200]) };

    await applyOptimizationModelToEditor({ model, lensStore, specsStore, proxy });

    const surfaceRow = lensStore.getState().rows.find((row) => row.kind === "surface")!;
    expect(proxy.getSurfaceSemiDiameters).toHaveBeenCalledWith(model);
    expect(lensStore.getState().autoSemiDiameters).toEqual({ [surfaceRow.id]: 6.25 });
    expect(surfaceRow.semiDiameter).toBe(5);
  });

  it("leaves the editor unchanged when fetching auto values fails", async () => {
    const { lensStore, specsStore } = stores();
    const initialRows = lensStore.getState().rows;
    const proxy = { getSurfaceSemiDiameters: jest.fn().mockRejectedValue(new Error("failed")) };

    await expect(applyOptimizationModelToEditor({ model, lensStore, specsStore, proxy })).rejects.toThrow("failed");

    expect(lensStore.getState().rows).toBe(initialRows);
    expect(lensStore.getState().committedOpticalModel).toBeUndefined();
  });

  it("bypasses extraction and clears the cache for manual models", async () => {
    const { lensStore, specsStore } = stores();
    lensStore.getState().setAutoSemiDiameters({ old: 9 });
    const proxy = { getSurfaceSemiDiameters: jest.fn() };

    await applyOptimizationModelToEditor({ model: { ...model, setAutoAperture: "manualAperture" }, lensStore, specsStore, proxy });

    expect(proxy.getSurfaceSemiDiameters).not.toHaveBeenCalled();
    expect(lensStore.getState().autoSemiDiameters).toEqual({});
  });
});
