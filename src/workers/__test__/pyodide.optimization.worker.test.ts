import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import { _evaluateOptimizationProblem, _optimizeOpm } from "@/workers/pyodide.worker";

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

describe("_optimizeOpm", () => {
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
    }, progressCallback);

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
});
