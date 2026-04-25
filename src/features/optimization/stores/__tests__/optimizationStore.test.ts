import { createStore } from "zustand";
import { formatOptimizerUiDefaultValue, OPTIMIZER_UI_CONFIG } from "@/features/optimization/lib/optimizerUiConfig";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import {
  createOptimizationSlice,
  hasNonZeroOptimizationContribution,
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

const asphericModel: OpticalModel = {
  ...baseModel,
  surfaces: [
    {
      ...baseModel.surfaces[0],
      aspherical: {
        kind: "RadialPolynomial",
        conicConstant: -1.25,
        polynomialCoefficients: [0.001, 0, 0.0003],
      },
    },
    {
      ...baseModel.surfaces[1],
    },
  ],
};

describe("optimizationStore", () => {
  it("detects non-zero optimization contribution for operand-only rows", () => {
    expect(hasNonZeroOptimizationContribution({
      merit_function: {
        operands: [
          {
            kind: "focal_length",
            target: 100,
            weight: 1,
          },
        ],
      },
    })).toBe(true);

    expect(hasNonZeroOptimizationContribution({
      merit_function: {
        operands: [
          {
            kind: "focal_length",
            target: 100,
            weight: 0,
          },
        ],
      },
    })).toBe(false);
  });

  it("detects non-zero optimization contribution from any field and wavelength combination", () => {
    expect(hasNonZeroOptimizationContribution({
      merit_function: {
        operands: [
          {
            kind: "rms_spot_size",
            target: 0,
            weight: 2,
            fields: [
              { index: 0, weight: 0 },
              { index: 1, weight: 0.5 },
            ],
            wavelengths: [
              { index: 0, weight: 0 },
              { index: 1, weight: 0 },
            ],
          },
          {
            kind: "opd_difference",
            target: 0,
            weight: 1,
            fields: [
              { index: 0, weight: 0 },
              { index: 1, weight: 1 },
            ],
            wavelengths: [
              { index: 0, weight: 0 },
              { index: 1, weight: 0.25 },
            ],
          },
        ],
      },
    })).toBe(true);
  });

  it("uses operand shape instead of operand kind names when checking contribution", () => {
    expect(hasNonZeroOptimizationContribution({
      merit_function: {
        operands: [
          {
            kind: "future_operand",
            target: 1,
            weight: 3,
            fields: [{ index: 0, weight: 0 }],
            wavelengths: [{ index: 0, weight: 0 }],
          },
          {
            kind: "future_operand",
            target: 2,
            weight: 4,
            fields: [{ index: 0, weight: 0.5 }],
          },
        ],
      },
    } as never)).toBe(true);
  });

  it("returns false when every effective contribution is zero", () => {
    expect(hasNonZeroOptimizationContribution({
      merit_function: {
        operands: [
          {
            kind: "focal_length",
            target: 100,
            weight: 0,
          },
          {
            kind: "rms_wavefront_error",
            target: 0,
            weight: 2,
            fields: [
              { index: 0, weight: 0 },
              { index: 1, weight: 0 },
            ],
            wavelengths: [
              { index: 0, weight: 1 },
              { index: 1, weight: 1 },
            ],
          },
        ],
      },
    })).toBe(false);
  });

  it("initializes from an optical model with default optimizer, radius/thickness controls, and no operand row", () => {
    const store = createStore<OptimizationState>(createOptimizationSlice);

    store.getState().initializeFromOpticalModel(baseModel);

    const state = store.getState();
    expect(state.optimizationModel).toEqual(baseModel);
    expect(state.activeTabId).toBe("algorithm");
    expect(state.optimizer.kind).toBe("least_squares");
    if (state.optimizer.kind !== "least_squares") {
      throw new Error("Expected least-squares optimizer state.");
    }
    expect(state.optimizer.method).toBe("trf");
    expect(state.optimizer.maxNumSteps).toBe("200");
    expect(state.optimizer.meritFunctionTolerance).toBe(
      formatOptimizerUiDefaultValue(OPTIMIZER_UI_CONFIG.least_squares.tolerances[0].default),
    );
    expect(state.optimizer.independentVariableTolerance).toBe(
      formatOptimizerUiDefaultValue(OPTIMIZER_UI_CONFIG.least_squares.tolerances[1].default),
    );
    expect(state.optimizer.gradientTolerance).toBe(
      formatOptimizerUiDefaultValue(OPTIMIZER_UI_CONFIG.least_squares.tolerances[2].default),
    );
    expect(state.fieldWeights).toEqual([1, 0, 0]);
    expect(state.wavelengthWeights).toEqual([1, 2, 1]);
    expect(state.radiusModes).toEqual([
      { surfaceIndex: 1, mode: "constant" },
      { surfaceIndex: 2, mode: "constant" },
      { surfaceIndex: 3, mode: "constant" },
    ]);
    expect(state.thicknessModes).toEqual([
      { surfaceIndex: 1, mode: "constant" },
      { surfaceIndex: 2, mode: "constant" },
    ]);
    expect(state.operands).toEqual([]);
  });

  it("adds the default focal-length operand row on demand", () => {
    const store = createStore<OptimizationState>(createOptimizationSlice);
    store.getState().initializeFromOpticalModel(baseModel);

    store.getState().addOperand();

    expect(store.getState().operands).toHaveLength(1);
    expect(store.getState().operands[0]).toMatchObject({
      kind: "focal_length",
      target: "100",
      weight: "1",
    });
  });

  it("accepts ray_fan rows and clears numeric target text when switching kinds", () => {
    const store = createStore<OptimizationState>(createOptimizationSlice);
    store.getState().initializeFromOpticalModel(baseModel);
    store.getState().replaceOperands([
      { id: "operand-1", kind: "focal_length", target: "125", weight: "2" },
    ]);

    store.getState().updateOperand("operand-1", { kind: "ray_fan" });

    expect(store.getState().operands).toEqual([
      { id: "operand-1", kind: "ray_fan", target: undefined, weight: "2" },
    ]);
  });

  it("omits target from Python config for target-less ray_fan operands", () => {
    const store = createStore<OptimizationState>(createOptimizationSlice);
    store.getState().initializeFromOpticalModel(baseModel);
    store.getState().replaceOperands([
      { id: "operand-1", kind: "ray_fan", target: undefined, weight: "2.5" },
    ]);

    expect(store.getState().buildOptimizationConfig()).toEqual({
      optimizer: {
        kind: "least_squares",
        method: "trf",
        max_nfev: 200,
        ftol: 1e-5,
        xtol: 1e-5,
        gtol: 1e-5,
      },
      variables: [],
      pickups: [],
      merit_function: {
        operands: [
          {
            kind: "ray_fan",
            weight: 2.5,
            options: { num_rays: 21 },
            fields: [
              { index: 0, weight: 1 },
              { index: 1, weight: 0 },
              { index: 2, weight: 0 },
            ],
            wavelengths: [
              { index: 0, weight: 1 },
              { index: 1, weight: 2 },
              { index: 2, weight: 1 },
            ],
          },
        ],
      },
    });
  });

  it("emits bounded trf variables and unbounded lm variables from shared method capabilities", () => {
    const store = createStore<OptimizationState>(createOptimizationSlice);
    store.getState().initializeFromOpticalModel(baseModel);

    store.getState().setRadiusMode(1, {
      mode: "variable",
      min: "40",
      max: "60",
    });
    store.getState().setThicknessMode(2, {
      mode: "variable",
      min: "10",
      max: "30",
    });
    store.getState().replaceOperands([
      { id: "operand-1", kind: "ray_fan", target: undefined, weight: "1" },
    ]);

    expect(store.getState().buildOptimizationConfig().variables).toEqual([
      { kind: "radius", surface_index: 1, min: 40, max: 60 },
      { kind: "thickness", surface_index: 2, min: 10, max: 30 },
    ]);

    store.setState((state) => ({
      optimizer: { ...state.optimizer, method: "lm" },
    }));

    expect(store.getState().buildOptimizationConfig().variables).toEqual([
      { kind: "radius", surface_index: 1 },
      { kind: "thickness", surface_index: 2 },
    ]);
  });

  it("builds Differential Evolution config with DE tolerances and finite variable bounds", () => {
    const store = createStore<OptimizationState>(createOptimizationSlice);
    store.getState().initializeFromOpticalModel(baseModel);

    store.setState((state) => ({
      optimizer: {
        ...state.optimizer,
        kind: "differential_evolution",
        relativeTolerance: "0.02",
        absoluteTolerance: "0",
      },
    }));
    store.getState().setRadiusMode(1, {
      mode: "variable",
      min: "40",
      max: "60",
    });
    store.getState().replaceOperands([
      {
        id: "operand-1",
        kind: "focal_length",
        target: "100",
        weight: "1",
      },
    ]);

    const config = store.getState().buildOptimizationConfig();

    expect(config.optimizer).toEqual({
      kind: "differential_evolution",
      max_nfev: 200,
      tol: 0.02,
      atol: 0,
    });
    expect(config.optimizer).not.toHaveProperty("method");
    expect(config.optimizer).not.toHaveProperty("ftol");
    expect(config.optimizer).not.toHaveProperty("xtol");
    expect(config.optimizer).not.toHaveProperty("gtol");
    expect(config.variables).toEqual([
      { kind: "radius", surface_index: 1, min: 40, max: 60 },
    ]);
  });

  it("does not apply least-squares residual-count validation to Differential Evolution", () => {
    const store = createStore<OptimizationState>(createOptimizationSlice);
    store.getState().initializeFromOpticalModel(baseModel);

    store.setState((state) => ({
      optimizer: {
        ...state.optimizer,
        kind: "differential_evolution",
        relativeTolerance: "0.01",
        absoluteTolerance: "0",
      },
    }));
    store.getState().setRadiusMode(1, {
      mode: "variable",
      min: "40",
      max: "60",
    });
    store.getState().setThicknessMode(2, {
      mode: "variable",
      min: "10",
      max: "30",
    });
    store.getState().replaceOperands([
      {
        id: "operand-1",
        kind: "focal_length",
        target: "100",
        weight: "1",
      },
    ]);

    expect(() => store.getState().buildOptimizationConfig()).not.toThrow();
  });

  it("resets algorithm fields when switching optimizer kind", () => {
    const store = createStore<OptimizationState>(createOptimizationSlice);

    store.setState((state) => ({
      optimizer: {
        ...state.optimizer,
        maxNumSteps: "99",
        meritFunctionTolerance: "1e-4",
      },
    }));

    store.getState().setOptimizerKind("differential_evolution");

    expect(store.getState().optimizer).toEqual({
      kind: "differential_evolution",
      maxNumSteps: "200",
      relativeTolerance: formatOptimizerUiDefaultValue(
        OPTIMIZER_UI_CONFIG.differential_evolution.tolerances[0].default,
      ),
      absoluteTolerance: formatOptimizerUiDefaultValue(
        OPTIMIZER_UI_CONFIG.differential_evolution.tolerances[1].default,
      ),
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
        ftol: 1e-5,
        xtol: 1e-5,
        gtol: 1e-5,
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
              { index: 2, weight: 0 },
            ],
            wavelengths: [
              { index: 0, weight: 1 },
              { index: 1, weight: 2 },
              { index: 2, weight: 0.25 },
            ],
          },
        ],
      },
    });
  });

  it("counts nominal ray_fan samples for lm validation", () => {
    const store = createStore<OptimizationState>(createOptimizationSlice);
    store.getState().initializeFromOpticalModel(baseModel);

    store.getState().setRadiusMode(1, {
      mode: "variable",
      min: "40",
      max: "60",
    });
    store.getState().setThicknessMode(2, {
      mode: "variable",
      min: "10",
      max: "30",
    });
    store.getState().setAsphereType(1, "RadialPolynomial");
    store.getState().setAsphereTermMode(1, "conic", {
      mode: "variable",
      min: "-2",
      max: "0",
    });
    store.getState().replaceOperands([
      { id: "operand-1", kind: "ray_fan", target: undefined, weight: "1" },
    ]);

    store.setState((state) => ({
      optimizer: { ...state.optimizer, method: "lm" },
    }));

    expect(() => store.getState().buildOptimizationConfig()).not.toThrow();
  });

  it("uses ray_fan operand options for lm residual-count validation", () => {
    const store = createStore<OptimizationState>(createOptimizationSlice);
    store.getState().initializeFromOpticalModel(baseModel);

    store.getState().setRadiusMode(1, {
      mode: "variable",
      min: "40",
      max: "60",
    });
    store.getState().setThicknessMode(2, {
      mode: "variable",
      min: "10",
      max: "30",
    });
    store.getState().setAsphereType(1, "RadialPolynomial");
    store.getState().setAsphereTermMode(1, "conic", {
      mode: "variable",
      min: "-2",
      max: "0",
    });
    store.getState().replaceOperands([
      { id: "operand-1", kind: "ray_fan", target: undefined, weight: "1" },
    ]);

    store.setState((state) => ({
      optimizer: { ...state.optimizer, method: "lm" },
    }));

    expect(() => store.getState().buildOptimizationConfig()).not.toThrow();
  });

  it("omits variable bounds from built config when the optimizer method is lm", () => {
    const store = createStore<OptimizationState>(createOptimizationSlice);
    store.getState().initializeFromOpticalModel(baseModel);

    store.setState((state) => ({
      optimizer: {
        ...state.optimizer,
        method: "lm",
      },
    }));
    store.getState().setRadiusMode(1, {
      mode: "variable",
      min: "40",
      max: "60",
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
        weight: "1",
      },
    ]);

    expect(store.getState().buildOptimizationConfig()).toEqual(expect.objectContaining({
      optimizer: expect.objectContaining({
        method: "lm",
      }),
      variables: [
        { kind: "radius", surface_index: 1 },
        { kind: "thickness", surface_index: 2 },
      ],
    }));
  });

  it("rejects lm when residual count is smaller than variable count", () => {
    const store = createStore<OptimizationState>(createOptimizationSlice);
    store.getState().initializeFromOpticalModel(baseModel);

    store.setState((state) => ({
      optimizer: {
        ...state.optimizer,
        method: "lm",
      },
    }));
    store.getState().setRadiusMode(1, {
      mode: "variable",
      min: "40",
      max: "60",
    });
    store.getState().setThicknessMode(2, {
      mode: "variable",
      min: "10",
      max: "30",
    });
    store.getState().replaceOperands([
      {
        id: "operand-1",
        kind: "focal_length",
        target: "100",
        weight: "1",
      },
    ]);

    expect(() => store.getState().buildOptimizationConfig()).toThrow(
      "Levenberg-Marquardt requires at least as many residuals as variables.",
    );
  });

  it("builds asphere variables and pickups into the Python optimization config", () => {
    const store = createStore<OptimizationState>(createOptimizationSlice);
    store.getState().initializeFromOpticalModel(asphericModel);

    expect(store.getState()).toEqual(expect.objectContaining({
      setAsphereType: expect.any(Function),
      setAsphereTermMode: expect.any(Function),
    }));

    store.getState().setAsphereTermMode(1, "conic", { mode: "variable", min: "-2", max: "-0.5" });
    store.getState().setAsphereTermMode(1, "coefficient", { mode: "variable", coefficientIndex: 1, min: "-0.01", max: "0.01" });
    store.getState().setAsphereTermMode(1, "coefficient", {
      mode: "pickup",
      coefficientIndex: 2,
      sourceSurfaceIndex: "1",
      sourceTermKey: "coefficient:1",
      scale: "2",
      offset: "0.5",
    });
    store.getState().replaceOperands([
      {
        id: "operand-1",
        kind: "focal_length",
        target: "100",
        weight: "1",
      },
    ]);

    expect(store.getState().buildOptimizationConfig()).toEqual(expect.objectContaining({
      variables: expect.arrayContaining([
        {
          kind: "asphere_conic_constant",
          surface_index: 1,
          asphere_kind: "RadialPolynomial",
          min: -2,
          max: -0.5,
        },
        {
          kind: "asphere_polynomial_coefficient",
          surface_index: 1,
          asphere_kind: "RadialPolynomial",
          coefficient_index: 1,
          min: -0.01,
          max: 0.01,
        },
      ]),
      pickups: expect.arrayContaining([
        {
          kind: "asphere_polynomial_coefficient",
          surface_index: 1,
          asphere_kind: "RadialPolynomial",
          coefficient_index: 2,
          source_surface_index: 1,
          source_coefficient_index: 1,
          scale: 2,
          offset: 0.5,
        },
      ]),
    }));
  });

  it("builds an asphere coefficient pickup with zero-based source coefficient index 0", () => {
    const store = createStore<OptimizationState>(createOptimizationSlice);
    store.getState().initializeFromOpticalModel(asphericModel);

    store.getState().setAsphereTermMode(1, "coefficient", {
      mode: "pickup",
      coefficientIndex: 1,
      sourceSurfaceIndex: "2",
      sourceTermKey: "coefficient:0",
      scale: "1.5",
      offset: "-0.25",
    });
    store.getState().replaceOperands([
      {
        id: "operand-1",
        kind: "focal_length",
        target: "100",
        weight: "1",
      },
    ]);

    expect(store.getState().buildOptimizationConfig().pickups).toEqual(expect.arrayContaining([
      {
        kind: "asphere_polynomial_coefficient",
        surface_index: 1,
        asphere_kind: "RadialPolynomial",
        coefficient_index: 1,
        source_surface_index: 2,
        source_coefficient_index: 0,
        scale: 1.5,
        offset: -0.25,
      },
    ]));
  });

  it("allows a spherical editor surface to become toroidal in optimization and applies optimized asphere values back into the model", () => {
    const store = createStore<OptimizationState>(createOptimizationSlice);
    store.getState().initializeFromOpticalModel(baseModel);

    store.getState().setAsphereType(2, "XToroid");
    store.getState().setAsphereTermMode(2, "conic", { mode: "variable", min: "-1", max: "0" });
    store.getState().setAsphereTermMode(2, "toricSweep", { mode: "variable", min: "-60", max: "-20" });
    store.getState().replaceOperands([
      {
        id: "operand-1",
        kind: "focal_length",
        target: "100",
        weight: "1",
      },
    ]);

    expect(store.getState().buildOptimizationConfig().variables).toEqual(expect.arrayContaining([
      {
        kind: "asphere_conic_constant",
        surface_index: 2,
        asphere_kind: "XToroid",
        min: -1,
        max: 0,
      },
      {
        kind: "asphere_toric_sweep_radius",
        surface_index: 2,
        asphere_kind: "XToroid",
        min: -60,
        max: -20,
      },
    ]));

    store.getState().applyOptimizationResult({
      success: true,
      status: "optimized",
      message: "done",
      optimizer: { kind: "least_squares", method: "trf" },
      initial_values: [],
      final_values: [
        {
          kind: "asphere_conic_constant",
          surface_index: 2,
          asphere_kind: "XToroid",
          value: -0.75,
        },
        {
          kind: "asphere_toric_sweep_radius",
          surface_index: 2,
          asphere_kind: "XToroid",
          value: -40,
        },
        {
          kind: "asphere_polynomial_coefficient",
          surface_index: 2,
          asphere_kind: "XToroid",
          coefficient_index: 3,
          value: 0.0002,
        },
      ],
      pickups: [],
      residuals: [],
      merit_function: { sum_of_squares: 0, rss: 0 },
      optimization_progress: [],
    });

    expect(store.getState().optimizationModel?.surfaces[1]?.aspherical).toEqual({
      kind: "XToroid",
      conicConstant: -0.75,
      toricSweepRadiusOfCurvature: -40,
      polynomialCoefficients: [0, 0, 0, 0.0002],
    });
  });

  it("resets the target to 0 when an operand is changed to opd_difference", () => {
    const store = createStore<OptimizationState>(createOptimizationSlice);
    store.getState().initializeFromOpticalModel(baseModel);
    store.getState().addOperand();

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
          { index: 2, weight: 0 },
        ],
        wavelengths: [
          { index: 0, weight: 1 },
          { index: 1, weight: 2 },
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

  it("requires at least one operand before building the optimization config", () => {
    const store = createStore<OptimizationState>(createOptimizationSlice);
    store.getState().initializeFromOpticalModel(baseModel);

    expect(() => store.getState().buildOptimizationConfig()).toThrow(
      "At least one operand is required.",
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

  it("applies an image-surface radius result to the local optical model snapshot", () => {
    const store = createStore<OptimizationState>(createOptimizationSlice);
    store.getState().initializeFromOpticalModel(baseModel);

    store.getState().applyOptimizationResult({
      success: true,
      status: "optimized",
      message: "done",
      optimizer: { kind: "least_squares", method: "trf" },
      initial_values: [
        { kind: "radius", surface_index: 3, value: 0, min: -100, max: 100 },
      ],
      final_values: [
        { kind: "radius", surface_index: 3, value: 75, min: -100, max: 100 },
      ],
      pickups: [],
      residuals: [],
      merit_function: { sum_of_squares: 0, rss: 0 },
      optimization_progress: [],
    });

    expect(store.getState().optimizationModel?.image.curvatureRadius).toBe(75);
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
    expect(state.fieldWeights).toEqual([1, 0.5, 0]);
    expect(state.radiusModes[0]).toEqual({
      surfaceIndex: 1,
      mode: "variable",
      min: "40",
      max: "60",
    });
  });
});
