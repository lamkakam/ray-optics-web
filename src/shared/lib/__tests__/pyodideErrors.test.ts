/** Shared boundary policy keeps diagnostics in the console and distinguishes normalized business errors from runtime failures. */
import {
  CALCULATION_FAILED_MESSAGE,
  INITIALIZATION_FAILED_MESSAGE,
  DUPLICATE_GLASS_MESSAGE,
  getPyodideErrorMessage,
  isPyodideBusinessError,
  normalizePyodideError,
  normalizeOptimizationReport,
  runPyodideOperation,
  withPyodideErrorHandling,
} from "../pyodideErrors";

const fold = "Projected-pupil mapping contains a fold or orientation reversal.";
const traceback = `Traceback (most recent call last):\n  File "/private/model.py", line 4, in calculate\nValueError: ${fold}\nprivate diagnostic note`;

describe("Pyodide error policy", () => {
  let warn: jest.SpyInstance;
  let error: jest.SpyInstance;
  beforeEach(() => {
    warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    error = jest.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it.each([fold, DUPLICATE_GLASS_MESSAGE])(
    "recognizes normalized business errors without logging: %s",
    (message) => {
      const normalized = normalizePyodideError(new Error(message), "analysis");
      warn.mockClear();
      expect(isPyodideBusinessError(normalized)).toBe(true);
      expect(warn).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
    },
  );

  it.each([
    new Error(fold),
    fold,
    { message: fold },
    { name: "PyodideFatalError", message: fold },
    { name: "PyodideFatalError", message: CALCULATION_FAILED_MESSAGE },
    { name: "PyodideBusinessError", message: "Unapproved message" },
    { name: "PyodideBusinessError", message: CALCULATION_FAILED_MESSAGE },
    { name: "PyodideBusinessError", message: 42 },
    { name: "PyodideBusinessError" },
    undefined,
  ])(
    "does not treat unnormalized or unapproved errors as business errors: %p",
    (failure) => {
      expect(isPyodideBusinessError(failure)).toBe(false);
      expect(warn).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
    },
  );

  it("warns once with the original traceback and retains the exact fold message", () => {
    const original = new Error(traceback);
    const safe = normalizePyodideError(original, "getWavefrontData");
    expect(safe).toMatchObject({ name: "PyodideBusinessError", message: fold });
    expect(safe.stack).toBeUndefined();
    expect(safe.cause).toBeUndefined();
    expect(warn).toHaveBeenCalledWith("[Pyodide:getWavefrontData]", original);
    expect(normalizePyodideError(safe, "transport")).toBe(safe);
    expect(getPyodideErrorMessage(safe)).toBe(fold);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(error).not.toHaveBeenCalled();
  });

  it("classifies the final chained exception, ignoring source lines and diagnostic notes", () => {
    const chained = new Error(
      `${traceback}\n\nThe above exception was the direct cause of the following exception:\n\nTraceback (most recent call last):\n  File "/private/model.py", line 9\nRuntimeError: internal failure\n${fold}`,
    );
    expect(normalizePyodideError(chained, "analysis").name).toBe(
      "PyodideFatalError",
    );
    expect(getPyodideErrorMessage(chained)).toBe(CALCULATION_FAILED_MESSAGE);
    expect(error).toHaveBeenCalledWith("[Pyodide:analysis]", chained);
  });

  it("does not interpret exception-like diagnostic notes as another exception", () => {
    expect(
      getPyodideErrorMessage(
        new Error(`${traceback}\nRuntimeError: diagnostic note only`),
      ),
    ).toBe(fold);
  });

  it.each(["error", "messageerror"])(
    "rejects pending and future calls on a worker %s event, logging once",
    async (type) => {
      const endpoint = new EventTarget();
      const api = withPyodideErrorHandling(
        { init: async () => {}, calculate: () => new Promise<never>(() => {}) },
        endpoint,
      );
      await api.init();
      const pending = api.calculate();
      endpoint.dispatchEvent(new Event(type));
      await expect(pending).rejects.toMatchObject({
        name: "PyodideFatalError",
        message: CALCULATION_FAILED_MESSAGE,
      });
      await expect(api.calculate()).rejects.toMatchObject({
        name: "PyodideFatalError",
        message: CALCULATION_FAILED_MESSAGE,
      });
      expect(error).toHaveBeenCalledTimes(1);
    },
  );

  it("uses initialization text for a worker event during startup", async () => {
    const endpoint = new EventTarget();
    const api = withPyodideErrorHandling(
      { init: () => new Promise<never>(() => {}) },
      endpoint,
    );
    const pending = api.init();
    endpoint.dispatchEvent(new Event("error"));
    await expect(pending).rejects.toMatchObject({
      message: INITIALIZATION_FAILED_MESSAGE,
    });
    expect(error).toHaveBeenCalledTimes(1);
  });

  it.each([
    new Error("ValueError: secret data"),
    new Error("private JavaScript error"),
    "private rejection",
    { message: "secret", stack: "private" },
    undefined,
  ])("hides unknown exceptions and non-Error rejections: %p", (original) => {
    const safe = normalizePyodideError(original, "analysis");
    expect(safe).toMatchObject({
      name: "PyodideFatalError",
      message: CALCULATION_FAILED_MESSAGE,
    });
    expect(safe.stack).toBeUndefined();
    expect(error).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();
  });

  it.each([
    [
      "ExactSpecConvergenceError: private details",
      "The exact optical specification could not be satisfied. Check the field and pupil settings.",
    ],
    [
      "TraceTIRError: private ray",
      "A ray could not be traced through the optical system. Check the prescription and aperture settings.",
    ],
    [
      "ValueError: Initial guess is outside of provided bounds",
      "Initial guess is outside of provided bounds",
    ],
    [
      "ValueError: User-defined glass already exists: private name",
      "A user-defined glass with this name already exists.",
    ],
  ])("maps recognized domain failures to approved text", (raw, message) => {
    expect(normalizePyodideError(new Error(raw), "calculation")).toMatchObject({
      name: "PyodideBusinessError",
      message,
    });
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("forces initialization and transport failures to error severity", async () => {
    await expect(
      runPyodideOperation("init", () => {
        throw new Error(traceback);
      }),
    ).rejects.toMatchObject({
      name: "PyodideFatalError",
      message: INITIALIZATION_FAILED_MESSAGE,
    });
    expect(
      normalizePyodideError(
        new Error(traceback),
        "getWavefrontData",
        "transport",
      ).message,
    ).toBe(CALCULATION_FAILED_MESSAGE);
    expect(error).toHaveBeenCalledTimes(2);
    expect(warn).not.toHaveBeenCalled();
  });

  it.each([
    [
      "ValueError: Insufficient valid samples for the requested Zernike terms.",
      "Insufficient valid samples for the requested Zernike terms.",
    ],
    [
      "ValueError: Exit pupil space is unavailable for infinite image space.",
      "Exit pupil space is unavailable for infinite image space.",
    ],
    [
      "ValueError: Zernike design matrix is rank deficient (3 < 37).",
      "The Zernike fit could not be completed. Try fewer terms or check the pupil settings.",
    ],
    [
      "ValueError: Centroid reference-sphere solve did not converge: private solver details",
      "The wavefront reference could not be calculated. Check the field and pupil settings.",
    ],
    [
      "ValueError: Unable to resolve glass 'private name' in catalog 'private catalog'",
      "A glass candidate could not be resolved. Check the selected catalogs and materials.",
    ],
  ])(
    "warns for known validation and optical failures without exposing variable details: %s",
    (raw, message) => {
      expect(normalizePyodideError(new Error(raw), "analysis")).toMatchObject({
        name: "PyodideBusinessError",
        message,
      });
      expect(warn).toHaveBeenCalledTimes(1);
      expect(error).not.toHaveBeenCalled();
    },
  );

  it("strips report diagnostics while preserving rollback and progress", () => {
    const report = {
      success: false,
      status: "error",
      message: fold,
      diagnostic: { exception_type: "ValueError", message: fold, traceback },
      initial_values: [{ value: 3 }],
      final_values: [{ value: 3 }],
      optimization_progress: [{ iteration: 1 }],
      merit_function: { rss: 4 },
    };
    const safe = normalizeOptimizationReport(report, "optimizeOpm");
    const { diagnostic: _diagnostic, ...expected } = report;
    expect(safe).toEqual(expected);
    expect(warn).toHaveBeenCalledWith("[Pyodide:optimizeOpm]", report);
    expect(report.diagnostic).toBeDefined();
  });

  it("warns for non-convergence but stays silent for stopped and successful runs", () => {
    expect(
      normalizeOptimizationReport(
        { success: false, status: 0, message: "private solver details" },
        "optimizeGlasses",
      ).message,
    ).toBe("Optimization did not converge.");
    expect(
      normalizeOptimizationReport(
        { success: false, status: "stopped", message: "Stopped by user" },
        "optimizeOpm",
      ).status,
    ).toBe("stopped");
    normalizeOptimizationReport(
      { success: true, status: 1, message: "Success" },
      "optimizeOpm",
    );
    expect(warn).toHaveBeenCalledTimes(1);
    expect(error).not.toHaveBeenCalled();
  });

  it("silently preserves cancellation with safe text", async () => {
    await expect(
      runPyodideOperation("analysis", () => {
        throw new DOMException("private abort detail", "AbortError");
      }),
    ).rejects.toMatchObject({
      name: "AbortError",
      message: "The calculation was cancelled.",
    });
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it.each([null, [], {}, { success: false, status: "error" }])(
    "rejects malformed reports safely",
    async (report) => {
      await expect(
        runPyodideOperation("optimizeOpm", () => report),
      ).rejects.toMatchObject({
        name: "PyodideFatalError",
        message: CALCULATION_FAILED_MESSAGE,
      });
      expect(error).toHaveBeenCalledTimes(1);
    },
  );
});
