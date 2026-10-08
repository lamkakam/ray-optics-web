import {
  getOptimizationBlockingReason,
  type OptimizationReadiness,
} from "@/features/optimization/lib/optimizationBlockingReason";

const ready: OptimizationReadiness = {
  isOptimizing: false,
  isReady: true,
  hasProxy: true,
  hasModel: true,
  missingGlassMessage: undefined,
  invalidConfigMessage: undefined,
  hasNonZeroContribution: true,
  hasActiveGridEdit: false,
  isEvaluationPending: false,
  evaluationWarningMessage: undefined,
  hasSuccessfulEvaluation: true,
};

describe("getOptimizationBlockingReason", () => {
  it("returns undefined when evaluation and execution can proceed", () => {
    expect(getOptimizationBlockingReason(ready, "evaluate")).toBeUndefined();
    expect(getOptimizationBlockingReason(ready, "execute")).toBeUndefined();
  });

  it.each([
    [
      "a run is active",
      { isOptimizing: true },
      "precondition_failed",
      "An optimization is already running.",
      "get_optimization_progress",
    ],
    [
      "the app is not initialized",
      { isReady: false },
      "not_ready",
      "Pyodide is not ready.",
      "retry",
    ],
    [
      "the worker is unavailable",
      { hasProxy: false },
      "not_ready",
      "Pyodide is not ready.",
      "retry",
    ],
    [
      "no model is loaded",
      { hasModel: false },
      "precondition_failed",
      "No optical model is loaded on the Optimization page.",
      "recompute_optical_system",
    ],
    [
      "glasses are missing",
      { missingGlassMessage: "Unknown glass Schott: N-XYZ." },
      "invalid_state",
      "Unknown glass Schott: N-XYZ.",
      "get_all_glasses",
    ],
    [
      "the configuration is invalid",
      {
        invalidConfigMessage: "Radius variable on surface 2: Min. is required.",
      },
      "invalid_state",
      "The Optimization configuration is invalid: Radius variable on surface 2: Min. is required.",
      "set_optimization_config",
    ],
  ] as const)(
    "blocks both stages when %s",
    (_case, overrides, code, message, hint) => {
      for (const stage of ["evaluate", "execute"] as const) {
        const reason = getOptimizationBlockingReason(
          { ...ready, ...overrides },
          stage,
        );
        expect(reason).toMatchObject({ code, message });
        expect(reason?.hint).toContain(hint);
      }
    },
  );

  it.each([
    [
      "every effective weight is zero",
      { hasNonZeroContribution: false },
      "At least one effective optimization weight must be non-zero.",
      "set_optimization_config",
    ],
    [
      "a grid cell is being edited",
      { hasActiveGridEdit: true },
      "An Optimization grid cell is still being edited.",
      "retry",
    ],
    [
      "operand evaluation is pending",
      { isEvaluationPending: true },
      "Operand evaluation of the current configuration is still in progress.",
      "evaluate_optimization_operands",
    ],
    [
      "the last evaluation reported a warning",
      {
        evaluationWarningMessage: "Initial guess is outside of provided bounds",
      },
      "Optimization is blocked by the current page warning: Initial guess is outside of provided bounds",
      "evaluate_optimization_operands",
    ],
    [
      "no successful evaluation exists",
      { hasSuccessfulEvaluation: false },
      "The current configuration has no successful operand evaluation.",
      "evaluate_optimization_operands",
    ],
  ] as const)(
    "blocks only execution when %s",
    (_case, overrides, message, hint) => {
      const state = { ...ready, ...overrides };
      expect(getOptimizationBlockingReason(state, "evaluate")).toBeUndefined();
      const reason = getOptimizationBlockingReason(state, "execute");
      expect(reason).toMatchObject({ code: "precondition_failed", message });
      expect(reason?.hint).toContain(hint);
    },
  );

  it("reports the earliest blocking condition first", () => {
    expect(
      getOptimizationBlockingReason(
        { ...ready, hasProxy: false, hasModel: false },
        "execute",
      )?.code,
    ).toBe("not_ready");
  });
});
