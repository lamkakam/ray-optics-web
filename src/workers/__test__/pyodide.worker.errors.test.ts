/** Every public RPC protects diagnostics while preserving report and lifecycle contracts. */
import * as worker from "../pyodide.worker";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import type { OptimizationConfig } from "@/features/optimization/types/optimizationWorkerTypes";
import { CALCULATION_FAILED_MESSAGE } from "@/shared/lib/pyodideErrors";

jest.mock("@/workers/loadPyodideModule", () => ({
  loadPyodideModule: jest.fn(),
}));
jest.mock("@/shared/lib/utils/pythonScript", () => ({
  buildScript: () => "calculation",
}));

const fold = "Projected-pupil mapping contains a fold or orientation reversal.";
const original = new Error(
  `Traceback (most recent call last):\n  File "/private/model.py", line 8\nProjectedPupilGeometryError: ${fold}`,
);
const model = { surfaces: [] } as unknown as OpticalModel;
const config = {} as OptimizationConfig;
const destroy = jest.fn();
const runPythonAsync = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
  worker._setPyodideForTesting({
    ffi: { PyProxy: { [Symbol.hasInstance]: () => false } },
    runPython: () => ({ destroy }),
    runPythonAsync,
  });
});
afterEach(() => {
  worker._resetPyodideForTesting();
  jest.restoreAllMocks();
});

it.each([
  ["getFirstOrderData", () => worker.getFirstOrderData(model)],
  ["getSurfaceSemiDiameters", () => worker.getSurfaceSemiDiameters(model)],
  ["plotLensLayout", () => worker.plotLensLayout(model, false)],
  ["getRayFanData", () => worker.getRayFanData(model, 0)],
  ["getOpdFanData", () => worker.getOpdFanData(model, 0)],
  ["getSpotDiagramData", () => worker.getSpotDiagramData(model, 0)],
  ["getFieldCurvatureData", () => worker.getFieldCurvatureData(model, 0)],
  ["getAstigmatismCurveData", () => worker.getAstigmatismCurveData(model, 0)],
  ["getLSAData", () => worker.getLSAData(model)],
  ["getWavefrontData", () => worker.getWavefrontData(model, 0, 0)],
  [
    "getStrehlVsWavelengthData",
    () => worker.getStrehlVsWavelengthData(model, 0),
  ],
  ["getGeoPSFData", () => worker.getGeoPSFData(model, 0, 0)],
  ["getDiffractionPSFData", () => worker.getDiffractionPSFData(model, 0, 0)],
  ["getDiffractionMTFData", () => worker.getDiffractionMTFData(model, 0, 0)],
  ["get3rdOrderSeidelData", () => worker.get3rdOrderSeidelData(model)],
  ["getZernikeCoefficients", () => worker.getZernikeCoefficients(model, 0, 0)],
  ["focusByMonoRmsSpot", () => worker.focusByMonoRmsSpot(model, 0)],
  ["focusByMonoStrehl", () => worker.focusByMonoStrehl(model, 0)],
  ["focusByPolyRmsSpot", () => worker.focusByPolyRmsSpot(model, 0)],
  ["focusByPolyStrehl", () => worker.focusByPolyStrehl(model, 0)],
  ["getAllGlassCatalogsData", () => worker.getAllGlassCatalogsData()],
  ["addUserDefinedGlasses", () => worker.addUserDefinedGlasses([])],
  ["deleteUserDefinedGlasses", () => worker.deleteUserDefinedGlasses([])],
  ["updateUserDefinedGlasses", () => worker.updateUserDefinedGlasses([])],
  ["getUserDefinedGlasses", () => worker.getUserDefinedGlasses([])],
] as const)(
  "sanitizes %s and releases the request namespace",
  async (operation, run) => {
    runPythonAsync.mockRejectedValueOnce(original);
    const safe = await run().catch((error: unknown) => error);
    expect(safe).toMatchObject({ name: "PyodideBusinessError", message: fold });
    expect((safe as Error).stack).toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith(
      `[Pyodide:${operation}]`,
      original,
    );
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(destroy).toHaveBeenCalledTimes(1);
  },
);

it.each([
  "evaluateOptimizationProblem",
  "optimizeOpm",
  "optimizeGlasses",
] as const)("normalizes resolved %s failures", async (operation) => {
  const report = {
    success: false,
    status: "error",
    message: fold,
    diagnostic: {
      exception_type: "ProjectedPupilGeometryError",
      message: fold,
      traceback: original.message,
    },
    final_values: [{ value: 5 }],
    optimization_progress: [{ iteration: 1 }],
  };
  runPythonAsync.mockResolvedValueOnce(JSON.stringify(report));
  const result = await (
    {
      evaluateOptimizationProblem: worker.evaluateOptimizationProblem,
      optimizeOpm: worker.optimizeOpm,
      optimizeGlasses: worker.optimizeGlasses,
    }[operation] as typeof worker.optimizeOpm
  )(model, config);
  expect(result).toEqual({
    success: false,
    status: "error",
    message: fold,
    final_values: [{ value: 5 }],
    optimization_progress: [{ iteration: 1 }],
  });
  expect(console.warn).toHaveBeenCalledWith(`[Pyodide:${operation}]`, report);
});

it("sanitizes malformed JSON as an unexpected failure", async () => {
  runPythonAsync.mockResolvedValueOnce("private invalid JSON");
  await expect(worker.getFirstOrderData(model)).rejects.toMatchObject({
    name: "PyodideFatalError",
    message: CALCULATION_FAILED_MESSAGE,
  });
  expect(console.error).toHaveBeenCalledTimes(1);
});

it.each([
  ["evaluateOptimizationProblem", worker.evaluateOptimizationProblem],
  ["optimizeOpm", worker.optimizeOpm],
  ["optimizeGlasses", worker.optimizeGlasses],
] as const)(
  "keeps %s reports safe without losing solver data",
  async (operation, run) => {
    const data = {
      initial_values: [{ value: 5 }],
      final_values: [{ value: 5 }],
      optimization_progress: [{ iteration: 4, merit_function_value: 8 }],
      optimizer: { nfev: 9 },
      merit_function: { rss: 3 },
      initial_glasses: [{ name: "N-BK7" }],
      final_glasses: [{ name: "N-BK7" }],
    };
    for (const [status, success, message, severity] of [
      ["error", false, CALCULATION_FAILED_MESSAGE, "error"],
      [0, false, "Optimization did not converge.", "warn"],
      ["stopped", false, "Optimization stopped.", undefined],
    ] as const) {
      jest.mocked(console.error).mockClear();
      jest.mocked(console.warn).mockClear();
      const raw = {
        ...data,
        status,
        success,
        message: "private detail",
        diagnostic: {
          exception_type: "RuntimeError",
          message: "private detail",
          traceback: "complete private traceback",
        },
      };
      runPythonAsync.mockResolvedValueOnce(JSON.stringify(raw));
      const safe = await (run as typeof worker.optimizeOpm)(model, config);
      expect(safe).toEqual({ ...data, status, success, message });
      if (severity)
        expect(console[severity]).toHaveBeenCalledWith(
          `[Pyodide:${operation}]`,
          raw,
        );
      expect(console.warn).toHaveBeenCalledTimes(severity === "warn" ? 1 : 0);
      expect(console.error).toHaveBeenCalledTimes(severity === "error" ? 1 : 0);
    }
  },
);
