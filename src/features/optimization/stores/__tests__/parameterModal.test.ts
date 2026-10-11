import { createStore } from "zustand";
import type { OpticalModel } from "@/shared/lib/optical-model/model/opticalModel";
import {
  createOptimizationSlice,
  type OptimizationState,
} from "@/features/optimization/stores/optimizationStore";

const baseModel: OpticalModel = {
  setAutoAperture: "manualAperture",
  object: { distance: 1e10, medium: "air", manufacturer: "" },
  image: { curvatureRadius: 0 },
  surfaces: [
    {
      label: "Default",
      curvatureRadius: 50,
      thickness: 5,
      medium: "BK7",
      manufacturer: "Schott",
      semiDiameter: 10,
    },
  ],
  specs: {
    pupil: { space: "object", type: "epd", value: 12.5 },
    field: {
      space: "object",
      type: "angle",
      maxField: 20,
      fields: [0, 1],
      isRelative: true,
    },
    wavelengths: { weights: [[587.562, 1]], referenceIndex: 0 },
  },
};

function createTestStore() {
  return createStore<OptimizationState>(createOptimizationSlice);
}

describe("optimizationStore — parameter modal", () => {
  it("initializes the parameter modal as closed with no group or surface index", () => {
    const store = createTestStore();
    const { parameterModal } = store.getState();
    expect(parameterModal.open).toBe(false);
    expect(parameterModal.group).toBeUndefined();
    expect(parameterModal.surfaceIndex).toBeUndefined();
  });

  it("opens the asphere parameter modal for a surface", () => {
    const store = createTestStore();
    store.getState().initializeFromOpticalModel(baseModel);
    store.getState().openParameterModal("aspherical", 1);

    const { parameterModal } = store.getState();
    expect(parameterModal.open).toBe(true);
    expect(parameterModal.group).toBe("aspherical");
    expect(parameterModal.surfaceIndex).toBe(1);
  });

  it("moves the open parameter modal to a different surface", () => {
    const store = createTestStore();
    store.getState().initializeFromOpticalModel(baseModel);
    store.getState().openParameterModal("aspherical", 1);
    store.getState().openParameterModal("aspherical", 2);

    const { parameterModal } = store.getState();
    expect(parameterModal.open).toBe(true);
    expect(parameterModal.surfaceIndex).toBe(2);
  });

  it("closes the parameter modal and clears its group and surface index", () => {
    const store = createTestStore();
    store.getState().initializeFromOpticalModel(baseModel);
    store.getState().openParameterModal("aspherical", 1);
    store.getState().closeParameterModal();

    const { parameterModal } = store.getState();
    expect(parameterModal.open).toBe(false);
    expect(parameterModal.group).toBeUndefined();
    expect(parameterModal.surfaceIndex).toBeUndefined();
  });
});
