import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import type {
  GlassOptimizationConfig,
  GlassOptimizationReport,
  OptimizationProgressEntry,
} from "@/features/optimization/types/optimizationWorkerTypes";
import {
  _evaluateOptimizationProblem,
  _getOptimizationInterruptStateForTesting,
  _optimizeGlasses,
  _optimizeOpm,
  _requestOptimizationStop,
  _setPyodideForTesting,
} from "@/workers/pyodide.worker";

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

const glassConfig: GlassOptimizationConfig = {
  glass_optimizer: { num_neighbours: 2, maxiter: 20, tol: 1e-4 },
  glass_variables: [
    {
      surface_index: 1,
      candidates: [
        { name: "N-BK7", catalog: "Schott" },
        { name: "N-LAK9", catalog: "Schott" },
      ],
    },
  ],
  variables: [{ kind: "radius", surface_index: 1, min: 40, max: 60 }],
  pickups: [],
  merit_function: {
    operands: [{ kind: "focal_length", target: 100, weight: 1 }],
  },
};

function glassReport(
  progress: ReadonlyArray<OptimizationProgressEntry> = [],
): GlassOptimizationReport {
  return {
    success: true,
    status: "optimized",
    message: "done",
    optimizer: {
      kind: "glass_expert",
      method: "L-BFGS-B",
      runs: 5,
      nfev: 20,
      nit: 4,
      num_neighbours: 2,
      maxiter: 20,
      tol: 1e-4,
    },
    initial_glasses: [{ surface_index: 1, name: "N-BK7", catalog: "Schott" }],
    final_glasses: [{ surface_index: 1, name: "N-LAK9", catalog: "Schott" }],
    initial_values: [],
    final_values: [],
    pickups: [],
    residuals: [],
    merit_function: { sum_of_squares: 1, rss: 1 },
    optimization_progress: progress,
  };
}

describe("_optimizeGlasses", () => {
  beforeEach(() => {
    _setPyodideForTesting(undefined);
  });

  it("serializes the flat glass config and invokes optimize_glasses", async () => {
    const runPython = jest.fn().mockResolvedValue(JSON.stringify(glassReport()));

    const result = await _optimizeGlasses(runPython, baseModel, glassConfig);

    expect(result.optimizer.kind).toBe("glass_expert");
    const source = runPython.mock.calls[0]?.[0] ?? "";
    expect(source).toContain("optimize_glasses(");
    expect(source).toContain('\\"glass_optimizer\\":{\\"num_neighbours\\":2,\\"maxiter\\":20,\\"tol\\":0.0001}');
    expect(source).toContain('\\"candidates\\":[{\\"name\\":\\"N-BK7\\",\\"catalog\\":\\"Schott\\"}');
  });

  it("parses candidate-aware progress and forwards the final history", async () => {
    const progress: OptimizationProgressEntry[] = [
      {
        iteration: 0,
        merit_function_value: 4,
        log10_merit_function_value: Math.log10(4),
        phase: "global",
        surface_index: 1,
        candidate: { name: "N-LAK9", catalog: "Schott" },
      },
      {
        iteration: 1,
        merit_function_value: 1,
        log10_merit_function_value: 0,
        phase: "polish",
      },
    ];
    const onProgress = jest.fn().mockResolvedValue(undefined);
    const pyodideGlobalsSet = jest.fn();
    const runPython = jest.fn().mockImplementation(async () => {
      const boundCallback = pyodideGlobalsSet.mock.calls[0]?.[1] as ((json: string) => void) | undefined;
      boundCallback?.(JSON.stringify(progress));
      return JSON.stringify(glassReport(progress));
    });
    _setPyodideForTesting({
      globals: { set: pyodideGlobalsSet, delete: jest.fn() },
      setInterruptBuffer: jest.fn(),
    });

    const result = await _optimizeGlasses(
      runPython,
      baseModel,
      glassConfig,
      "chief_ray",
      onProgress,
    );

    expect(onProgress).toHaveBeenCalledWith(progress);
    expect(result.optimization_progress[0]).toMatchObject({
      phase: "global",
      surface_index: 1,
      candidate: { name: "N-LAK9", catalog: "Schott" },
    });
  });

  it("shares interrupt setup and guaranteed cleanup on Python errors", async () => {
    const setInterruptBuffer = jest.fn();
    const globalsSet = jest.fn();
    const globalsDelete = jest.fn();
    _setPyodideForTesting({
      setInterruptBuffer,
      globals: { set: globalsSet, delete: globalsDelete },
    });
    const interruptBuffer = new SharedArrayBuffer(4);
    const runPython = jest.fn().mockRejectedValue(new Error("python failed"));

    await expect(_optimizeGlasses(
      runPython,
      baseModel,
      glassConfig,
      "centroid",
      jest.fn(),
      "glass-run",
      interruptBuffer,
    )).rejects.toThrow("python failed");

    expect(setInterruptBuffer).toHaveBeenNthCalledWith(1, expect.any(Int32Array));
    expect(setInterruptBuffer).toHaveBeenLastCalledWith(undefined);
    expect(globalsDelete).toHaveBeenCalledWith("_optimization_progress_callback");
    expect(_getOptimizationInterruptStateForTesting()).toEqual({
      activeRunId: undefined,
      interruptBuffer: undefined,
    });
  });

  it("cleans up progress and interrupt state when interrupt setup throws", async () => {
    const setInterruptBuffer = jest.fn().mockImplementation((view?: Int32Array) => {
      if (view !== undefined) {
        throw new Error("interrupt setup failed");
      }
    });
    const globalsSet = jest.fn();
    const globalsDelete = jest.fn();
    _setPyodideForTesting({
      setInterruptBuffer,
      globals: { set: globalsSet, delete: globalsDelete },
    });
    const interruptBuffer = new SharedArrayBuffer(4);
    const runPython = jest.fn();

    await expect(_optimizeGlasses(
      runPython,
      baseModel,
      glassConfig,
      "chief_ray",
      jest.fn(),
      "glass-setup-error",
      interruptBuffer,
    )).rejects.toThrow("interrupt setup failed");

    expect(runPython).not.toHaveBeenCalled();
    expect(setInterruptBuffer).toHaveBeenLastCalledWith(undefined);
    expect(globalsDelete).toHaveBeenCalledWith("_optimization_progress_callback");
    expect(_getOptimizationInterruptStateForTesting()).toEqual({
      activeRunId: undefined,
      interruptBuffer: undefined,
    });
  });

  it("is present on the typed public worker API", () => {
    const optimizeGlasses: PyodideWorkerAPI["optimizeGlasses"] = async () => glassReport();

    expect(optimizeGlasses).toBeDefined();
  });
});

describe("_optimizeOpm", () => {
  beforeEach(() => {
    _setPyodideForTesting(undefined);
  });

  it("runs optimize_opm in Python and parses the JSON result", async () => {
    const runPython = jest.fn().mockResolvedValue(
      JSON.stringify({
        success: true,
        status: "optimized",
        message: "done",
        optimizer: { kind: "least_squares", method: "trf" },
        initial_values: [],
        final_values: [],
        pickups: [],
        residuals: [],
        merit_function: { sum_of_squares: 0, rss: 0 },
      }),
    );

    const result = await _optimizeOpm(runPython, baseModel, {
      optimizer: { kind: "least_squares", method: "trf", max_nfev: 200, ftol: 1e-8, xtol: 1e-8, gtol: 1e-8 },
      variables: [],
      pickups: [],
      merit_function: { operands: [{ kind: "focal_length", target: 100, weight: 1 }] },
    });

    expect(result.success).toBe(true);
    expect(runPython).toHaveBeenCalledWith(expect.stringContaining("optimize_opm("));
    expect(runPython).toHaveBeenCalledWith(expect.stringContaining('\\"kind\\":\\"least_squares\\"'));
  });

  it("passes Differential Evolution optimizer config without least-squares keys", async () => {
    const runPython = jest.fn().mockResolvedValue(
      JSON.stringify({
        success: true,
        status: "optimized",
        message: "done",
        optimizer: { kind: "differential_evolution", nfev: 25, nit: 3 },
        initial_values: [],
        final_values: [],
        pickups: [],
        residuals: [],
        merit_function: { sum_of_squares: 0, rss: 0 },
      }),
    );

    await _optimizeOpm(runPython, baseModel, {
      optimizer: { kind: "differential_evolution", max_nfev: 50, tol: 0.01, atol: 0 },
      variables: [{ kind: "radius", surface_index: 1, min: 40, max: 60 }],
      pickups: [],
      merit_function: { operands: [{ kind: "focal_length", target: 100, weight: 1 }] },
    });

    const pythonSource = runPython.mock.calls[0]?.[0] ?? "";
    expect(pythonSource).toContain('\\"kind\\":\\"differential_evolution\\"');
    expect(pythonSource).toContain('\\"tol\\":0.01');
    expect(pythonSource).toContain('\\"atol\\":0');
    expect(pythonSource).not.toContain('\\"method\\"');
    expect(pythonSource).not.toContain('\\"ftol\\"');
    expect(pythonSource).not.toContain('\\"xtol\\"');
    expect(pythonSource).not.toContain('\\"gtol\\"');
  });

  it("streams optimization progress through the supplied callback and returns the final history", async () => {
    const progressCallback = jest.fn().mockResolvedValue(undefined);
    const runPython = jest.fn().mockImplementation(async () => {
      await progressCallback([
        { iteration: 0, merit_function_value: 25, log10_merit_function_value: Math.log10(25) },
      ]);
      await progressCallback([
        { iteration: 0, merit_function_value: 25, log10_merit_function_value: Math.log10(25) },
        { iteration: 1, merit_function_value: 4, log10_merit_function_value: Math.log10(4) },
      ]);

      return JSON.stringify({
        success: true,
        status: "optimized",
        message: "done",
        optimizer: { kind: "least_squares", method: "trf" },
        initial_values: [],
        final_values: [],
        pickups: [],
        residuals: [],
        merit_function: { sum_of_squares: 4, rss: 2 },
        optimization_progress: [
          { iteration: 0, merit_function_value: 25, log10_merit_function_value: Math.log10(25) },
          { iteration: 1, merit_function_value: 4, log10_merit_function_value: Math.log10(4) },
        ],
      });
    });

    const result = await _optimizeOpm(runPython, baseModel, {
      optimizer: { kind: "least_squares", method: "trf", max_nfev: 200, ftol: 1e-8, xtol: 1e-8, gtol: 1e-8 },
      variables: [],
      pickups: [],
      merit_function: { operands: [{ kind: "focal_length", target: 100, weight: 1 }] },
    }, "chief_ray", progressCallback);

    expect(progressCallback).toHaveBeenCalledTimes(2);
    expect(progressCallback).toHaveBeenNthCalledWith(2, [
      { iteration: 0, merit_function_value: 25, log10_merit_function_value: Math.log10(25) },
      { iteration: 1, merit_function_value: 4, log10_merit_function_value: Math.log10(4) },
    ]);
    expect(result.optimization_progress).toEqual([
      { iteration: 0, merit_function_value: 25, log10_merit_function_value: Math.log10(25) },
      { iteration: 1, merit_function_value: 4, log10_merit_function_value: Math.log10(4) },
    ]);
  });

  it("sets and clears interrupt state around an optimization run", async () => {
    const setInterruptBuffer = jest.fn();
    _setPyodideForTesting({
      setInterruptBuffer,
      globals: { set: jest.fn(), delete: jest.fn() },
    });
    const interruptBuffer = new SharedArrayBuffer(4);
    const runPython = jest.fn().mockImplementation(async () => {
      expect(_getOptimizationInterruptStateForTesting()).toMatchObject({
        activeRunId: "run-1",
        interruptBuffer,
      });
      return JSON.stringify({
        success: true,
        status: "optimized",
        message: "done",
        optimizer: { kind: "least_squares", method: "trf" },
        initial_values: [],
        final_values: [],
        pickups: [],
        residuals: [],
        merit_function: { sum_of_squares: 0, rss: 0 },
        optimization_progress: [],
      });
    });

    await _optimizeOpm(runPython, baseModel, {
      optimizer: { kind: "least_squares", method: "trf", max_nfev: 200, ftol: 1e-8, xtol: 1e-8, gtol: 1e-8 },
      variables: [],
      pickups: [],
      merit_function: { operands: [{ kind: "focal_length", target: 100, weight: 1 }] },
    }, "chief_ray", undefined, "run-1", interruptBuffer);

    expect(setInterruptBuffer).toHaveBeenNthCalledWith(1, expect.any(Int32Array));
    expect(setInterruptBuffer.mock.calls[0]?.[0].buffer).toBe(interruptBuffer);
    expect(setInterruptBuffer).toHaveBeenLastCalledWith(undefined);
    expect(_getOptimizationInterruptStateForTesting()).toMatchObject({
      activeRunId: undefined,
      interruptBuffer: undefined,
    });
  });

  it("signals only the active matching run id and treats stale stops as no-ops", async () => {
    const interruptBuffer = new SharedArrayBuffer(4);
    const interruptView = new Int32Array(interruptBuffer);
    _setPyodideForTesting({
      setInterruptBuffer: jest.fn(),
      globals: { set: jest.fn(), delete: jest.fn() },
    });
    const runPython = jest.fn().mockImplementation(async () => {
      expect(await _requestOptimizationStop("old-run")).toEqual({ signaled: false });
      expect(Atomics.load(interruptView, 0)).toBe(0);
      expect(await _requestOptimizationStop("run-2")).toEqual({ signaled: true });
      expect(Atomics.load(interruptView, 0)).toBe(2);
      return JSON.stringify({
        success: true,
        status: "stopped",
        message: "Optimization stopped by user",
        optimizer: { kind: "least_squares", method: "trf" },
        initial_values: [],
        final_values: [],
        pickups: [],
        residuals: [],
        merit_function: { sum_of_squares: 0, rss: 0 },
        optimization_progress: [],
      });
    });

    await _optimizeOpm(runPython, baseModel, {
      optimizer: { kind: "least_squares", method: "trf", max_nfev: 200, ftol: 1e-8, xtol: 1e-8, gtol: 1e-8 },
      variables: [],
      pickups: [],
      merit_function: { operands: [{ kind: "focal_length", target: 100, weight: 1 }] },
    }, "chief_ray", undefined, "run-2", interruptBuffer);

    expect(await _requestOptimizationStop("run-2")).toEqual({ signaled: false });
  });
});

describe("_evaluateOptimizationProblem", () => {
  it("runs evaluate_optimization_problem in Python and parses the JSON result", async () => {
    const runPython = jest.fn().mockResolvedValue(
      JSON.stringify({
        success: true,
        status: "evaluated",
        message: "ok",
        optimizer: { kind: "least_squares", method: "trf" },
        initial_values: [],
        final_values: [],
        pickups: [],
        residuals: [
          {
            kind: "rms_spot_size",
            target: 0,
            value: 0.42,
            field_index: 0,
            wavelength_index: 0,
            operand_weight: 1,
            field_weight: 1,
            wavelength_weight: 1,
            total_weight: 1,
            weighted_residual: 0.42,
          },
        ],
        merit_function: { sum_of_squares: 0.1764, rss: 0.42 },
      }),
    );

    const result = await _evaluateOptimizationProblem(runPython, baseModel, {
      optimizer: { kind: "least_squares", method: "trf", max_nfev: 200, ftol: 1e-8, xtol: 1e-8, gtol: 1e-8 },
      variables: [],
      pickups: [],
      merit_function: { operands: [{ kind: "rms_spot_size", target: 0, weight: 1, fields: [{ index: 0, weight: 1 }], wavelengths: [{ index: 0, weight: 1 }] }] },
    });

    expect(result.status).toBe("evaluated");
    expect(result.residuals[0]?.value).toBe(0.42);
    expect(runPython).toHaveBeenCalledWith(expect.stringContaining("evaluate_optimization_problem("));
    expect(runPython).toHaveBeenCalledWith(expect.stringContaining('\\"kind\\":\\"least_squares\\"'));
  });

  it("passes ray_fan operands without target and accepts residuals without target", async () => {
    const runPython = jest.fn().mockResolvedValue(
      JSON.stringify({
        success: true,
        status: "evaluated",
        message: "ok",
        optimizer: { kind: "least_squares", method: "trf" },
        initial_values: [],
        final_values: [],
        pickups: [],
        residuals: [
          {
            kind: "ray_fan",
            value: 0.42,
            field_index: 0,
            wavelength_index: 0,
            operand_weight: 1,
            field_weight: 1,
            wavelength_weight: 1,
            total_weight: 1,
            weighted_residual: 0.42,
          },
        ],
        merit_function: { sum_of_squares: 0.1764, rss: 0.42 },
      }),
    );

    const result = await _evaluateOptimizationProblem(runPython, baseModel, {
      optimizer: { kind: "least_squares", method: "trf", max_nfev: 200, ftol: 1e-8, xtol: 1e-8, gtol: 1e-8 },
      variables: [],
      pickups: [],
      merit_function: {
        operands: [{ kind: "ray_fan", weight: 1, fields: [{ index: 0, weight: 1 }], wavelengths: [{ index: 0, weight: 1 }] }],
      },
    });

    expect(result.residuals[0]?.kind).toBe("ray_fan");
    expect(result.residuals[0]?.target).toBeUndefined();
    expect(runPython).toHaveBeenCalledWith(expect.stringContaining('\\"kind\\":\\"ray_fan\\"'));
    expect(runPython).toHaveBeenCalledWith(expect.not.stringContaining('\\"target\\"'));
  });

  it("preserves image-surface radius variables in the generated Python config", async () => {
    const runPython = jest.fn().mockResolvedValue(
      JSON.stringify({
        success: true,
        status: "evaluated",
        message: "ok",
        optimizer: { kind: "least_squares", method: "trf" },
        initial_values: [],
        final_values: [],
        pickups: [],
        residuals: [],
        merit_function: { sum_of_squares: 0, rss: 0 },
      }),
    );

    await _evaluateOptimizationProblem(runPython, baseModel, {
      optimizer: { kind: "least_squares", method: "trf", max_nfev: 200, ftol: 1e-8, xtol: 1e-8, gtol: 1e-8 },
      variables: [{ kind: "radius", surface_index: 2, min: -100, max: 100 }],
      pickups: [],
      merit_function: { operands: [{ kind: "opd_difference", target: 0, weight: 100, fields: [{ index: 1, weight: 1 }], wavelengths: [{ index: 0, weight: 1 }] }] },
    });

    expect(runPython).toHaveBeenCalledWith(expect.stringContaining('\\"surface_index\\":2'));
  });

  it("preserves asphere optimization metadata in the generated Python config", async () => {
    const runPython = jest.fn().mockResolvedValue(
      JSON.stringify({
        success: true,
        status: "evaluated",
        message: "ok",
        optimizer: { kind: "least_squares", method: "trf" },
        initial_values: [],
        final_values: [],
        pickups: [],
        residuals: [],
        merit_function: { sum_of_squares: 0, rss: 0 },
      }),
    );

    await _evaluateOptimizationProblem(runPython, {
      ...baseModel,
      surfaces: [
        {
          ...baseModel.surfaces[0],
          aspherical: {
            kind: "RadialPolynomial",
            conicConstant: -1,
            polynomialCoefficients: [0.001, 0.002],
          },
        },
      ],
    }, {
      optimizer: { kind: "least_squares", method: "trf", max_nfev: 200, ftol: 1e-8, xtol: 1e-8, gtol: 1e-8 },
      variables: [
        {
          kind: "asphere_polynomial_coefficient",
          surface_index: 1,
          asphere_kind: "RadialPolynomial",
          coefficient_index: 1,
          min: -0.1,
          max: 0.1,
        },
      ],
      pickups: [
        {
          kind: "asphere_conic_constant",
          surface_index: 1,
          asphere_kind: "RadialPolynomial",
          source_surface_index: 1,
          scale: 1,
          offset: 0,
        },
      ],
      merit_function: { operands: [{ kind: "focal_length", target: 100, weight: 1 }] },
    });

    expect(runPython).toHaveBeenCalledWith(expect.stringContaining('\\"kind\\":\\"asphere_polynomial_coefficient\\"'));
    expect(runPython).toHaveBeenCalledWith(expect.stringContaining('\\"asphere_kind\\":\\"RadialPolynomial\\"'));
    expect(runPython).toHaveBeenCalledWith(expect.stringContaining('\\"coefficient_index\\":1'));
  });
});
