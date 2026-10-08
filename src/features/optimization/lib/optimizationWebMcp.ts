/** Dependency-injected WebMCP descriptors for the mounted Optimization page. */
import type { StoreApi } from "zustand";
import type { AllGlassCatalogsData } from "@/features/glass-map/types/glassMap";
import {
  assertWebMcpInput,
  assertWebMcpNotCancelled,
} from "@/shared/lib/webMcpValidation";
import { WebMcpToolError } from "@/shared/lib/webMcpErrors";
import { createPrescriptionAjv } from "@/shared/lib/schemas/prescriptionSchema";
import type { OptimizationState } from "@/features/optimization/stores/optimizationStore";
import type {
  OptimizationProgressEntry,
  OptimizationReport,
  OptimizationRunConfig,
  OptimizationRunReport,
} from "@/features/optimization/types/optimizationWorkerTypes";
import {
  createOptimizationRunConfigValidator,
  emptyOptimizationInputSchema,
  optimizationRunConfigSchema,
} from "@/features/optimization/lib/optimizationConfigSchema";

/** Result returned by the shared confirmed apply operation. */
export interface OptimizationApplyResult {
  readonly surfaceCount: number;
}

/** Result returned by the shared discard-optimization-result operation. */
export interface OptimizationDiscardResult {
  /** Whether an optimized prescription was pending before this discard. */
  readonly wasPending: boolean;
}

/** Result returned by the shared Optimization Progress modal dismiss operation. */
export interface OptimizationProgressDismissResult {
  /** Whether the progress modal was open before this dismissal. */
  readonly wasOpen: boolean;
}

/**
 * Outcome of the shared Optimization Stop operation:
 * - `stop_requested`: the active run was signalled to stop.
 * - `already_stopping`: a stop was already requested for the active run.
 * - `already_stopped`: no run is active; the last run was interrupted.
 * - `already_completed`: no run is active; the last run ended without interruption.
 * - `not_running`: no run is active and none has run since the page mounted.
 */
export type OptimizationStopState =
  | "stop_requested"
  | "already_stopping"
  | "already_stopped"
  | "already_completed"
  | "not_running";

/** Result returned by the shared Optimization Stop operation. */
export interface OptimizationStopResult {
  readonly state: OptimizationStopState;
}

/** Snapshot read by the shared Optimization progress operation. */
export interface OptimizationProgressSnapshot {
  /** Whether an optimization run is still active, so the history may still grow. */
  readonly isRunning: boolean;
  /**
   * Chronological merit history plotted by the progress modal chart: streamed
   * entries while running, the settled report's history afterwards, and empty
   * before the first run since mount.
   */
  readonly progress: ReadonlyArray<OptimizationProgressEntry>;
}

/** Agent-facing step number and merit function value of one progress entry. */
function toProgressStep(entry: OptimizationProgressEntry | undefined) {
  return entry === undefined
    ? undefined
    : { step: entry.iteration, meritFunctionValue: entry.merit_function_value };
}

/** Earliest progress entry with the lowest merit function value, or undefined for an empty history. */
function findBestProgressEntry(
  progress: ReadonlyArray<OptimizationProgressEntry>,
): OptimizationProgressEntry | undefined {
  return progress.reduce<OptimizationProgressEntry | undefined>(
    (best, entry) =>
      best === undefined ||
      entry.merit_function_value < best.merit_function_value
        ? entry
        : best,
    undefined,
  );
}

/** Agent-facing explanation returned by `stop_optimization` for each stop state. */
const STOP_MESSAGES: Readonly<Record<OptimizationStopState, string>> = {
  stop_requested:
    'Stop requested. The running optimization will settle with a status "stopped" report, which an awaiting execute_optimization call returns. Call dismiss_optimization_progress afterwards to close the Optimization Progress modal.',
  already_stopping:
    "A stop has already been requested for the running optimization. Wait for it to settle.",
  already_stopped:
    "No optimization is running. The last optimization has already been interrupted.",
  already_completed:
    "No optimization is running. The last optimization has already completed.",
  not_running: "No optimization is running.",
};

/** Page callbacks shared by GUI controls and imperative Optimization tools. */
export interface OptimizationWebMcpDependencies {
  readonly optimizationStore: StoreApi<OptimizationState>;
  readonly catalogs: AllGlassCatalogsData | undefined;
  /** Runs the same fresh evaluation used by the automatic page effect. */
  readonly evaluate: (signal: AbortSignal) => Promise<OptimizationReport>;
  /** Runs the same optimization operation used by the Optimize button. */
  readonly execute: (signal: AbortSignal) => Promise<OptimizationRunReport>;
  /** Runs the same throwing, confirmed apply operation used by the modal. */
  readonly apply: (signal: AbortSignal) => Promise<OptimizationApplyResult>;
  /**
   * Runs the same discard operation used by the confirmed Discard action;
   * throws while an optimization run is still active.
   */
  readonly discard: (signal: AbortSignal) => OptimizationDiscardResult;
  /**
   * Runs the same dismiss operation used by the progress modal `OK` control;
   * throws while an optimization run is still active.
   */
  readonly dismissProgress: (
    signal: AbortSignal,
  ) => OptimizationProgressDismissResult;
  /**
   * Runs the same stop operation used by the progress modal Stop control;
   * returns immediately after signalling and throws when the active run
   * cannot be interrupted.
   */
  readonly stop: (signal: AbortSignal) => OptimizationStopResult;
  /** Reads the merit history shown by the progress modal chart and whether a run is active. */
  readonly readProgress: (signal: AbortSignal) => OptimizationProgressSnapshot;
}

type OptimizationWebMcpDependenciesSource =
  | OptimizationWebMcpDependencies
  | (() => OptimizationWebMcpDependencies);

/** Named readonly handles for the nine page-scoped Optimization descriptors. */
export type OptimizationWebMcpTools = Readonly<{
  readonly setOptimizationConfig: WebMCP.ModelContextTool;
  readonly getOptimizationConfig: WebMCP.ModelContextTool;
  readonly evaluateOptimizationOperands: WebMCP.ModelContextTool;
  readonly executeOptimization: WebMCP.ModelContextTool;
  readonly applyOptimizationToEditor: WebMCP.ModelContextTool;
  readonly discardOptimizationResult: WebMCP.ModelContextTool;
  readonly dismissOptimizationProgress: WebMCP.ModelContextTool;
  readonly stopOptimization: WebMCP.ModelContextTool;
  readonly getOptimizationProgress: WebMCP.ModelContextTool;
}>;

const validators = (() => {
  const configValidator = createOptimizationRunConfigValidator();
  const emptyValidator = createPrescriptionAjv().compile(
    emptyOptimizationInputSchema,
  );
  return {
    config: configValidator,
    empty: emptyValidator,
  };
})();

/** Rejects a worker report whose status is `error`; solver outcomes still resolve. */
function assertNotErrorReport<T extends { status: unknown; message: string }>(
  report: T,
): T {
  if (report.status === "error")
    throw new WebMcpToolError("calculation_failed", report.message, {
      details: { report },
    });
  return report;
}

const CONFIG_HINT =
  "Call get_optimization_config to inspect it, then set_optimization_config with a corrected configuration.";

/** Builds the canonical config, reporting an invalid current page state as `invalid_state`. */
function buildCurrentConfig(dependencies: OptimizationWebMcpDependencies) {
  try {
    return dependencies.optimizationStore
      .getState()
      .buildOptimizationConfig(dependencies.catalogs);
  } catch (error: unknown) {
    throw new WebMcpToolError(
      "invalid_state",
      `The current Optimization configuration is invalid: ${error instanceof Error ? error.message : String(error)}`,
      { hint: CONFIG_HINT },
    );
  }
}

function currentDependencies(
  source: OptimizationWebMcpDependenciesSource,
): OptimizationWebMcpDependencies {
  return typeof source === "function" ? source() : source;
}

/**
 * Creates strict descriptors bound to one live Optimization page. A worker
 * report with `status: "error"` rejects evaluation and execution with a
 * `calculation_failed` `WebMcpToolError` carrying the sanitized report in
 * `details.report`; unconverged and stopped reports still resolve. Store
 * rejections of a supplied config are `invalid_input`, a run in progress is
 * `precondition_failed`, and an unbuildable current config is `invalid_state`.
 */
export function createOptimizationWebMcpTools(
  source: OptimizationWebMcpDependenciesSource,
): OptimizationWebMcpTools {
  return {
    setOptimizationConfig: {
      name: "set_optimization_config",
      description:
        "Replace the complete Optimization configuration using the worker-facing OptimizationRunConfig contract.",
      inputSchema: optimizationRunConfigSchema,
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (input, { signal }) => {
        assertWebMcpInput(validators.config, input);
        assertWebMcpNotCancelled(signal);
        const dependencies = currentDependencies(source);
        const state = dependencies.optimizationStore.getState();
        if (state.isOptimizing)
          throw new WebMcpToolError(
            "precondition_failed",
            "Cannot change optimization configuration while a run is already running.",
            {
              hint: "Wait for execute_optimization to settle, or call stop_optimization.",
            },
          );
        try {
          state.setOptimizationConfig(
            input as OptimizationRunConfig,
            dependencies.catalogs,
          );
        } catch (error: unknown) {
          throw new WebMcpToolError(
            "invalid_input",
            `Invalid optimization config: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
        const config = buildCurrentConfig(dependencies);
        assertWebMcpNotCancelled(signal);
        return JSON.stringify({ configured: true, config });
      },
    },
    getOptimizationConfig: {
      name: "get_optimization_config",
      description: "Read the canonical current OptimizationRunConfig.",
      inputSchema: emptyOptimizationInputSchema,
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: async (input, { signal }) => {
        assertWebMcpInput(validators.empty, input);
        assertWebMcpNotCancelled(signal);
        const config = buildCurrentConfig(currentDependencies(source));
        assertWebMcpNotCancelled(signal);
        return JSON.stringify(config);
      },
    },
    evaluateOptimizationOperands: {
      name: "evaluate_optimization_operands",
      description:
        "Immediately evaluate the current Optimization operands and return the complete worker report.",
      inputSchema: emptyOptimizationInputSchema,
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: async (input, { signal }) => {
        assertWebMcpInput(validators.empty, input);
        assertWebMcpNotCancelled(signal);
        const report = await currentDependencies(source).evaluate(signal);
        assertWebMcpNotCancelled(signal);
        return JSON.stringify(assertNotErrorReport(report));
      },
    },
    executeOptimization: {
      name: "execute_optimization",
      description:
        "Run the current Optimization configuration and return the complete continuous or Glass Expert worker report.",
      inputSchema: emptyOptimizationInputSchema,
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (input, { signal }) => {
        assertWebMcpInput(validators.empty, input);
        assertWebMcpNotCancelled(signal);
        const report = await currentDependencies(source).execute(signal);
        assertWebMcpNotCancelled(signal);
        return JSON.stringify(assertNotErrorReport(report));
      },
    },
    applyOptimizationToEditor: {
      name: "apply_optimization_to_editor",
      description:
        "Confirm and apply the current optimized model to the Lens Editor.",
      inputSchema: emptyOptimizationInputSchema,
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (input, { signal }) => {
        assertWebMcpInput(validators.empty, input);
        assertWebMcpNotCancelled(signal);
        const result = await currentDependencies(source).apply(signal);
        assertWebMcpNotCancelled(signal);
        return JSON.stringify({
          applied: true,
          surfaceCount: result.surfaceCount,
        });
      },
    },
    discardOptimizationResult: {
      name: "discard_optimization_result",
      description:
        "Discard the pending optimized lens prescription and restore the Optimization page's prescription from the Lens Editor, like the Discard button after confirmation. The Lens Editor is not changed. Returns an error while an optimization is running.",
      inputSchema: emptyOptimizationInputSchema,
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (input, { signal }) => {
        assertWebMcpInput(validators.empty, input);
        assertWebMcpNotCancelled(signal);
        const result = currentDependencies(source).discard(signal);
        return JSON.stringify({
          discarded: true,
          wasPending: result.wasPending,
        });
      },
    },
    dismissOptimizationProgress: {
      name: "dismiss_optimization_progress",
      description:
        "Dismiss the Optimization Progress modal after the optimization has finished or been interrupted. Returns an error while the optimization is still running.",
      inputSchema: emptyOptimizationInputSchema,
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (input, { signal }) => {
        assertWebMcpInput(validators.empty, input);
        assertWebMcpNotCancelled(signal);
        const result = currentDependencies(source).dismissProgress(signal);
        return JSON.stringify({ dismissed: true, wasOpen: result.wasOpen });
      },
    },
    stopOptimization: {
      name: "stop_optimization",
      description:
        "Interrupt the running optimization, like the Optimization Progress Stop button. Returns immediately after the stop is signalled. If no optimization is running (never started, already completed, or already interrupted), returns a message explaining that instead.",
      inputSchema: emptyOptimizationInputSchema,
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (input, { signal }) => {
        assertWebMcpInput(validators.empty, input);
        assertWebMcpNotCancelled(signal);
        const { state } = currentDependencies(source).stop(signal);
        return JSON.stringify({
          stopRequested: state === "stop_requested",
          state,
          message: STOP_MESSAGES[state],
        });
      },
    },
    getOptimizationProgress: {
      name: "get_optimization_progress",
      description:
        "Read the optimization progress shown in the Optimization Progress chart: the step number and merit function value of the most recent step (latestStep), of the step before it (previousStep), and of the step with the lowest merit function value so far (bestStep, the earliest one on ties), plus whether an optimization is still running. Works during a run and after it settles. Judge whether the merit function has levelled off from bestStep: latestStep can rise or jump because the history records every counted evaluation, including rejected least-squares trial steps and differential-evolution trial members. Stopping keeps the bestStep state (Glass Expert keeps its best fully completed glass candidate instead). A step is omitted when the history does not contain it yet, so all three are omitted before the first optimization run.",
      inputSchema: emptyOptimizationInputSchema,
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: async (input, { signal }) => {
        assertWebMcpInput(validators.empty, input);
        assertWebMcpNotCancelled(signal);
        const { isRunning, progress } =
          currentDependencies(source).readProgress(signal);
        return JSON.stringify({
          isRunning,
          latestStep: toProgressStep(progress.at(-1)),
          previousStep: toProgressStep(progress.at(-2)),
          bestStep: toProgressStep(findBestProgressEntry(progress)),
        });
      },
    },
  };
}

/** Alias using the all-capitals acronym used by the composition hook. */
export const createOptimizationWebMCPTools = createOptimizationWebMcpTools;
