/** Covers successful editor commits and cancellation before any editor or specs mutation. */
import { createStore } from "zustand/vanilla";
import {
  createLensEditorSlice,
  type LensEditorState,
} from "@/features/lens-editor/stores/lensEditorStore";
import {
  createSpecsConfiguratorSlice,
  type SpecsConfiguratorState,
} from "@/features/lens-editor/stores/specsConfiguratorStore";
import { applyOptimizationModelToEditor } from "@/features/optimization/lib/applyOptimizationModelToEditor";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";

const model: OpticalModel = {
  setAutoAperture: "autoAperture",
  object: { distance: 1e10, medium: "air", manufacturer: "" },
  image: { curvatureRadius: 0 },
  surfaces: [
    {
      label: "Default",
      curvatureRadius: 20,
      thickness: 2,
      medium: "air",
      manufacturer: "",
      semiDiameter: 5,
    },
  ],
  specs: {
    pupil: { space: "object", type: "epd", value: 10 },
    field: {
      space: "object",
      type: "angle",
      maxField: 1,
      fields: [0, 1],
      isRelative: true,
    },
    wavelengths: { weights: [[587.6, 1]], referenceIndex: 0 },
  },
};

function stores() {
  return {
    lensStore: createStore<LensEditorState>(createLensEditorSlice),
    specsStore: createStore<SpecsConfiguratorState>(
      createSpecsConfiguratorSlice,
    ),
  };
}

describe("applyOptimizationModelToEditor", () => {
  it.each(["autoAperture", "manualAperture"] as const)(
    "rejects a pre-aborted %s apply without touching either store or the worker",
    async (setAutoAperture) => {
      const { lensStore, specsStore } = stores();
      const initialLensState = lensStore.getState();
      const initialSpecsState = specsStore.getState();
      const proxy = {
        getSurfaceSemiDiameters: jest.fn().mockResolvedValue([100, 6.25, 200]),
      };
      const controller = new AbortController();
      controller.abort();
      const params = {
        model: { ...model, setAutoAperture },
        lensStore,
        specsStore,
        proxy,
        signal: controller.signal,
      };

      await expect(
        applyOptimizationModelToEditor(params),
      ).rejects.toMatchObject({
        name: "AbortError",
      });

      expect(lensStore.getState()).toBe(initialLensState);
      expect(specsStore.getState()).toBe(initialSpecsState);
      expect(proxy.getSurfaceSemiDiameters).not.toHaveBeenCalled();
    },
  );

  it("leaves both stores unchanged when cancelled during aperture extraction", async () => {
    const { lensStore, specsStore } = stores();
    const initialLensState = lensStore.getState();
    const initialSpecsState = specsStore.getState();
    let resolveAperture!: (values: number[]) => void;
    const aperture = new Promise<number[]>((resolve) => {
      resolveAperture = resolve;
    });
    const proxy = { getSurfaceSemiDiameters: jest.fn(() => aperture) };
    const controller = new AbortController();
    const params = {
      model,
      lensStore,
      specsStore,
      proxy,
      signal: controller.signal,
    };

    const application = applyOptimizationModelToEditor(params);
    expect(proxy.getSurfaceSemiDiameters).toHaveBeenCalledWith(model);
    expect(lensStore.getState()).toBe(initialLensState);
    expect(specsStore.getState()).toBe(initialSpecsState);
    controller.abort();
    resolveAperture([100, 6.25, 200]);

    await expect(application).rejects.toMatchObject({ name: "AbortError" });
    expect(lensStore.getState()).toBe(initialLensState);
    expect(specsStore.getState()).toBe(initialSpecsState);
  });

  it("fetches auto values before atomically applying the model", async () => {
    const { lensStore, specsStore } = stores();
    const proxy = {
      getSurfaceSemiDiameters: jest.fn().mockResolvedValue([100, 6.25, 200]),
    };

    await applyOptimizationModelToEditor({
      model,
      lensStore,
      specsStore,
      proxy,
    });

    const surfaceRow = lensStore
      .getState()
      .rows.find((row) => row.kind === "surface")!;
    expect(proxy.getSurfaceSemiDiameters).toHaveBeenCalledWith(model);
    expect(lensStore.getState().autoSemiDiameters).toEqual({
      [surfaceRow.id]: 6.25,
    });
    expect(surfaceRow.semiDiameter).toBe(5);
  });

  it("leaves the editor unchanged when fetching auto values fails", async () => {
    const { lensStore, specsStore } = stores();
    const initialRows = lensStore.getState().rows;
    const proxy = {
      getSurfaceSemiDiameters: jest.fn().mockRejectedValue(new Error("failed")),
    };

    await expect(
      applyOptimizationModelToEditor({ model, lensStore, specsStore, proxy }),
    ).rejects.toThrow("failed");

    expect(lensStore.getState().rows).toBe(initialRows);
    expect(lensStore.getState().committedOpticalModel).toBeUndefined();
  });

  it("bypasses extraction and clears the cache for manual models", async () => {
    const { lensStore, specsStore } = stores();
    lensStore.getState().setAutoSemiDiameters({ old: 9 });
    const proxy = { getSurfaceSemiDiameters: jest.fn() };

    await applyOptimizationModelToEditor({
      model: { ...model, setAutoAperture: "manualAperture" },
      lensStore,
      specsStore,
      proxy,
    });

    expect(proxy.getSurfaceSemiDiameters).not.toHaveBeenCalled();
    expect(lensStore.getState().autoSemiDiameters).toEqual({});
  });

  it("loads committed specs and preserves optimization synchronization policy", async () => {
    const { lensStore, specsStore } = stores();
    const proxy = { getSurfaceSemiDiameters: jest.fn() };

    await applyOptimizationModelToEditor({
      model: { ...model, setAutoAperture: "manualAperture" },
      lensStore,
      specsStore,
      proxy,
    });

    const normalizedSpecs = {
      ...model.specs,
      field: { ...model.specs.field, isWideAngle: false },
    };
    expect(specsStore.getState().toOpticalSpecs()).toEqual(normalizedSpecs);
    expect(specsStore.getState().committedSpecs).toEqual(normalizedSpecs);
    expect(lensStore.getState().optimizationSyncPolicy).toBe(
      "preserveOptimizationModes",
    );
    expect(lensStore.getState().autoAperture).toBe(false);
    expect(lensStore.getState().committedOpticalModel).toEqual({
      ...model,
      setAutoAperture: "manualAperture",
    });
  });
});
