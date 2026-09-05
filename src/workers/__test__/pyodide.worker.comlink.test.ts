/**
 * Comlink exposure contract: the worker publishes exactly the public RPC
 * methods consumed by `PyodideWorkerAPI`; injectable helpers and lifecycle test
 * controls stay local to the module.
 */
import { describe, expect, it } from "@jest/globals";

describe("Pyodide worker Comlink exposure", () => {
  it("exposes the complete public RPC mapping", () => {
    const expose = jest.fn();

    jest.isolateModules(() => {
      jest.doMock("comlink", () => ({
        expose,
        releaseProxy: Symbol("releaseProxy"),
      }));
      jest.doMock("@/workers/loadPyodideModule", () => ({
        loadPyodideModule: jest.fn(),
      }));

      require("../pyodide.worker");
    });

    expect(expose).toHaveBeenCalledTimes(1);
    const exposedApi = expose.mock.calls[0]?.[0] as Record<string, unknown>;
    const publicMethods = [
      "init",
      "getFirstOrderData",
      "getSurfaceSemiDiameters",
      "plotLensLayout",
      "getRayFanData",
      "getOpdFanData",
      "getSpotDiagramData",
      "getFieldCurvatureData",
      "getAstigmatismCurveData",
      "getLSAData",
      "getWavefrontData",
      "getStrehlVsWavelengthData",
      "getGeoPSFData",
      "getDiffractionPSFData",
      "getDiffractionMTFData",
      "get3rdOrderSeidelData",
      "getZernikeCoefficients",
      "focusByMonoRmsSpot",
      "focusByMonoStrehl",
      "focusByPolyRmsSpot",
      "focusByPolyStrehl",
      "getAllGlassCatalogsData",
      "addUserDefinedGlasses",
      "deleteUserDefinedGlasses",
      "updateUserDefinedGlasses",
      "getUserDefinedGlasses",
      "canInterruptOptimization",
      "requestOptimizationStop",
      "evaluateOptimizationProblem",
      "optimizeGlasses",
      "optimizeOpm",
    ];

    expect(Object.keys(exposedApi).sort()).toEqual([...publicMethods].sort());
    for (const method of publicMethods) {
      expect(exposedApi[method]).toEqual(expect.any(Function));
    }
  });
});
