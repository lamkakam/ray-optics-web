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
    {
      label: "Stop",
      curvatureRadius: -40,
      thickness: 20,
      medium: "air",
      manufacturer: "",
      semiDiameter: 9,
    },
  ],
  specs: {
    pupil: { space: "object", type: "epd", value: 12.5 },
    field: { space: "object", type: "angle", maxField: 20, fields: [0, 0.7, 1], isRelative: true },
    wavelengths: { weights: [[486.133, 1], [587.562, 2], [656.273, 1]], referenceIndex: 1 },
  },
};

describe("optimizationStore", () => {
  it("initializes from an optical model with default optimizer, radius/thickness controls, and operand row", () => {
    const store = createStore<OptimizationState>(createOptimizationSlice);

    store.getState().initializeFromOpticalModel(baseModel);

    const state = store.getState();
    expect(state.optimizationModel).toEqual(baseModel);
    expect(state.activeTabId).toBe("algorithm");
    expect(state.optimizer.kind).toBe("least_squares");
    expect(state.optimizer.method).toBe("trf");
    expect(state.optimizer.maxNumSteps).toBe("200");
    expect(state.optimizer.meritFunctionTolerance).toBe("1e-8");
    expect(state.fieldWeights).toEqual([1, 1, 1]);
    expect(state.wavelengthWeights).toEqual([1, 1, 1]);
    expect(state.radiusModes).toEqual([
      { surfaceIndex: 1, mode: "constant" },
      { surfaceIndex: 2, mode: "constant" },
      { surfaceIndex: 3, mode: "constant" },
    ]);
    expect(state.thicknessModes).toEqual([
      { surfaceIndex: 1, mode: "constant" },
      { surfaceIndex: 2, mode: "constant" },
    ]);
    expect(state.operands).toHaveLength(1);
    expect(state.operands[0]).toMatchObject({
      kind: "focal_length",
      target: "100",
      weight: "1",
    });
  });

  it("builds the Python optimization config using current slice state", () => {
    const store = createStore<OptimizationState>(createOptimizationSlice);
    store.getState().initializeFromOpticalModel(baseModel);

    store.getState().setFieldWeight(1, "0.5");
    store.getState().setWavelengthWeight(2, "0.25");
    store.getState().setRadiusMode(1, {
      mode: "variable",
      min: "40",
      max: "60",
    });
    store.getState().setRadiusMode(2, {
      mode: "pickup",
      sourceSurfaceIndex: "1",
      scale: "-1",
      offset: "0.5",
    });
    store.getState().setThicknessMode(2, {
      mode: "variable",
      min: "10",
      max: "30",
    });
    store.getState().replaceOperands([
      {
        id: "operand-1",
        kind: "rms_spot_size",
        target: "0",
        weight: "2.5",
      },
    ]);

    expect(store.getState().buildOptimizationConfig()).toEqual({
      optimizer: {
        kind: "least_squares",
        method: "trf",
        max_nfev: 200,
        ftol: 1e-8,
        xtol: 1e-8,
        gtol: 1e-8,
      },
      variables: [
        { kind: "radius", surface_index: 1, min: 40, max: 60 },
        { kind: "thickness", surface_index: 2, min: 10, max: 30 },
      ],
      pickups: [
        { kind: "radius", surface_index: 2, source_surface_index: 1, scale: -1, offset: 0.5 },
      ],
      merit_function: {
        operands: [
          {
            kind: "rms_spot_size",
            target: 0,
            weight: 2.5,
            fields: [
              { index: 0, weight: 1 },
              { index: 1, weight: 0.5 },
              { index: 2, weight: 1 },
            ],
            wavelengths: [
              { index: 0, weight: 1 },
              { index: 1, weight: 1 },
              { index: 2, weight: 0.25 },
            ],
          },
        ],
      },
    });
  });

  it("resets the target to 0 when an operand is changed to opd_difference", () => {
    const store = createStore<OptimizationState>(createOptimizationSlice);
    store.getState().initializeFromOpticalModel(baseModel);

    const operandId = store.getState().operands[0].id;
    store.getState().updateOperand(operandId, { kind: "opd_difference" });

    expect(store.getState().operands[0]).toMatchObject({
      kind: "opd_difference",
      target: "0",
      weight: "1",
    });
  });

  it("builds the Python optimization config for opd_difference with field and wavelength weights", () => {
    const store = createStore<OptimizationState>(createOptimizationSlice);
    store.getState().initializeFromOpticalModel(baseModel);

    store.getState().setFieldWeight(1, "0.5");
    store.getState().setWavelengthWeight(2, "0.25");
    store.getState().replaceOperands([
      {
        id: "operand-1",
        kind: "opd_difference",
        target: "0",
        weight: "1.5",
      },
    ]);

    expect(store.getState().buildOptimizationConfig().merit_function.operands).toEqual([
      {
        kind: "opd_difference",
        target: 0,
        weight: 1.5,
        fields: [
          { index: 0, weight: 1 },
          { index: 1, weight: 0.5 },
          { index: 2, weight: 1 },
        ],
        wavelengths: [
          { index: 0, weight: 1 },
          { index: 1, weight: 1 },
          { index: 2, weight: 0.25 },
        ],
      },
    ]);
  });

  it("rejects operand weights that are not positive non-zero numbers", () => {
    const store = createStore<OptimizationState>(createOptimizationSlice);
    store.getState().initializeFromOpticalModel(baseModel);

    store.getState().replaceOperands([
      {
        id: "operand-1",
        kind: "focal_length",
        target: "100",
        weight: "0",
      },
    ]);

    expect(() => store.getState().buildOptimizationConfig()).toThrow(
      "Weight must be a positive non-zero number.",
    );
  });

  it("applies optimization result radius and thickness values to the local optical model snapshot", () => {
    const store = createStore<OptimizationState>(createOptimizationSlice);
    store.getState().initializeFromOpticalModel(baseModel);

    store.getState().applyOptimizationResult({
      success: true,
      status: "optimized",
      message: "done",
      optimizer: { kind: "least_squares", method: "trf" },
      initial_values: [
        { kind: "radius", surface_index: 1, value: 50, min: 40, max: 60 },
      ],
      final_values: [
        { kind: "radius", surface_index: 1, value: 42, min: 40, max: 60 },
        { kind: "thickness", surface_index: 2, value: 25, min: 10, max: 30 },
      ],
      pickups: [
        {
          kind: "radius",
          surface_index: 2,
          source_surface_index: 1,
          scale: -1,
          offset: 0,
          value: -42,
        },
      ],
      residuals: [],
      merit_function: { sum_of_squares: 0, rss: 0 },
      optimization_progress: [],
    });

    const model = store.getState().optimizationModel;
    expect(model?.surfaces[0].curvatureRadius).toBe(42);
    expect(model?.surfaces[1].curvatureRadius).toBe(-42);
    expect(model?.surfaces[1].thickness).toBe(25);
    expect(model?.image.curvatureRadius).toBe(0);
  });

  it("syncs from a changed editor model while preserving compatible optimization state", () => {
    const store = createStore<OptimizationState>(createOptimizationSlice);
    store.getState().initializeFromOpticalModel(baseModel);
    store.getState().setFieldWeight(1, "0.5");
    store.getState().setRadiusMode(1, {
      mode: "variable",
      min: "40",
      max: "60",
    });

    const updatedModel: OpticalModel = {
      ...baseModel,
      surfaces: [
        {
          ...baseModel.surfaces[0],
          curvatureRadius: 75,
        },
        ...baseModel.surfaces.slice(1),
      ],
    };

    store.getState().syncFromOpticalModel(updatedModel);

    const state = store.getState();
    expect(state.optimizationModel?.surfaces[0].curvatureRadius).toBe(75);
    expect(state.fieldWeights).toEqual([1, 0.5, 1]);
    expect(state.radiusModes[0]).toEqual({
      surfaceIndex: 1,
      mode: "variable",
      min: "40",
      max: "60",
    });
  });
});
