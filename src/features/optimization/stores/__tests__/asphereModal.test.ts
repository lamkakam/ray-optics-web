import { createStore } from "zustand";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
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
    field: { space: "object", type: "angle", maxField: 20, fields: [0, 1], isRelative: true },
    wavelengths: { weights: [[587.562, 1]], referenceIndex: 0 },
  },
};

function createTestStore() {
  return createStore<OptimizationState>(createOptimizationSlice);
}

describe("optimizationStore — asphere modal", () => {
  it("initializes asphereModal as closed with no surface index", () => {
    const store = createTestStore();
    const { asphereModal } = store.getState();
    expect(asphereModal.open).toBe(false);
    expect(asphereModal.surfaceIndex).toBeUndefined();
  });

  it("openAsphereModal sets open=true and stores surfaceIndex", () => {
    const store = createTestStore();
    store.getState().initializeFromOpticalModel(baseModel);
    store.getState().openAsphereModal(1);

    const { asphereModal } = store.getState();
    expect(asphereModal.open).toBe(true);
    expect(asphereModal.surfaceIndex).toBe(1);
  });

  it("openAsphereModal can update to a different surfaceIndex", () => {
    const store = createTestStore();
    store.getState().initializeFromOpticalModel(baseModel);
    store.getState().openAsphereModal(1);
    store.getState().openAsphereModal(2);

    const { asphereModal } = store.getState();
    expect(asphereModal.open).toBe(true);
    expect(asphereModal.surfaceIndex).toBe(2);
  });

  it("closeAsphereModal sets open=false and clears surfaceIndex", () => {
    const store = createTestStore();
    store.getState().initializeFromOpticalModel(baseModel);
    store.getState().openAsphereModal(1);
    store.getState().closeAsphereModal();

    const { asphereModal } = store.getState();
    expect(asphereModal.open).toBe(false);
    expect(asphereModal.surfaceIndex).toBeUndefined();
  });
});
