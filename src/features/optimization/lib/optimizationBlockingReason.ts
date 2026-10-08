/**
 * Explains why the Optimization page cannot evaluate operands or run an
 * optimization, replacing a single generic "not ready" failure with the first
 * specific blocking condition and an actionable hint for WebMCP callers.
 */
import { WebMcpToolError } from "@/shared/lib/webMcpErrors";

/** Snapshot of every condition that gates operand evaluation and optimization. */
export interface OptimizationReadiness {
  /** Whether an optimization run is active. */
  readonly isOptimizing: boolean;
  /** Whether app initialization has finished. */
  readonly isReady: boolean;
  /** Whether the Pyodide worker proxy exists. */
  readonly hasProxy: boolean;
  /** Whether the page has an optical model to optimize. */
  readonly hasModel: boolean;
  /** Formatted unknown-media message for the page model, when any. */
  readonly missingGlassMessage: string | undefined;
  /** Message thrown while building the current configuration, when invalid. */
  readonly invalidConfigMessage: string | undefined;
  /** Whether any effective operand, field, or wavelength weight is non-zero. */
  readonly hasNonZeroContribution: boolean;
  /** Whether an Optimization grid cell editor is open. */
  readonly hasActiveGridEdit: boolean;
  /** Whether evaluation of the current configuration is running or scheduled. */
  readonly isEvaluationPending: boolean;
  /** Page warning set by the last failed evaluation or run, when any. */
  readonly evaluationWarningMessage: string | undefined;
  /** Whether the current configuration has a successful evaluation report. */
  readonly hasSuccessfulEvaluation: boolean;
}

/** `evaluate` checks only what operand evaluation needs; `execute` checks everything. */
export type OptimizationStage = "evaluate" | "execute";

const RETRY_HINT = "Wait for app initialization to finish, then retry.";
const EVALUATE_HINT =
  "Call evaluate_optimization_operands, which waits for a fresh evaluation, then retry execute_optimization.";

/**
 * Returns a typed `WebMcpToolError` for the first condition blocking `stage`,
 * in the same order the page computes `canOptimize`, or `undefined` when the
 * stage can proceed. Evaluation stops after the configuration check; execution
 * also requires a non-zero contribution, no open grid edit, no pending
 * evaluation, no evaluation warning, and a successful evaluation.
 */
export function getOptimizationBlockingReason(
  readiness: OptimizationReadiness,
  stage: OptimizationStage,
): WebMcpToolError | undefined {
  if (readiness.isOptimizing)
    return new WebMcpToolError(
      "precondition_failed",
      "An optimization is already running.",
      {
        hint: "Wait for execute_optimization to settle (see get_optimization_progress), or call stop_optimization.",
      },
    );
  if (!readiness.isReady || !readiness.hasProxy)
    return new WebMcpToolError("not_ready", "Pyodide is not ready.", {
      hint: RETRY_HINT,
    });
  if (!readiness.hasModel)
    return new WebMcpToolError(
      "precondition_failed",
      "No optical model is loaded on the Optimization page.",
      {
        hint: "Set up the lens on the lens_editor page, call recompute_optical_system, then return with set_active_page.",
      },
    );
  if (readiness.missingGlassMessage !== undefined)
    return new WebMcpToolError("invalid_state", readiness.missingGlassMessage, {
      hint: "Fix the unknown media in the Lens Editor; use get_all_glasses or get_custom_glasses for exact names.",
    });
  if (readiness.invalidConfigMessage !== undefined)
    return new WebMcpToolError(
      "invalid_state",
      `The Optimization configuration is invalid: ${readiness.invalidConfigMessage}`,
      {
        hint: "Call get_optimization_config to inspect it, then set_optimization_config with a corrected configuration.",
      },
    );
  if (stage === "evaluate") return undefined;

  if (!readiness.hasNonZeroContribution)
    return new WebMcpToolError(
      "precondition_failed",
      "At least one effective optimization weight must be non-zero.",
      {
        hint: "Call set_optimization_config with a positive operand weight and non-zero field and wavelength weights.",
      },
    );
  if (readiness.hasActiveGridEdit)
    return new WebMcpToolError(
      "precondition_failed",
      "An Optimization grid cell is still being edited.",
      { hint: "Finish or cancel the cell edit in the page, then retry." },
    );
  if (readiness.isEvaluationPending)
    return new WebMcpToolError(
      "precondition_failed",
      "Operand evaluation of the current configuration is still in progress.",
      { hint: EVALUATE_HINT },
    );
  if (readiness.evaluationWarningMessage !== undefined)
    return new WebMcpToolError(
      "precondition_failed",
      `Optimization is blocked by the current page warning: ${readiness.evaluationWarningMessage}`,
      {
        hint: "Fix the configuration or prescription, call evaluate_optimization_operands until it succeeds, then retry execute_optimization.",
      },
    );
  if (!readiness.hasSuccessfulEvaluation)
    return new WebMcpToolError(
      "precondition_failed",
      "The current configuration has no successful operand evaluation.",
      { hint: EVALUATE_HINT },
    );
  return undefined;
}
