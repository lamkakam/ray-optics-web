/** Dependency-injected WebMCP descriptors for the mounted Optimization page. */
import type { StoreApi } from "zustand";
import type { AllGlassCatalogsData } from "@/features/glass-map/types/glassMap";
import {
  assertWebMcpInput,
  assertWebMcpNotCancelled,
} from "@/shared/lib/webMcpValidation";
import { createPrescriptionAjv } from "@/shared/lib/schemas/prescriptionSchema";
import type { OptimizationState } from "@/features/optimization/stores/optimizationStore";
import type {
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
}

type OptimizationWebMcpDependenciesSource =
  | OptimizationWebMcpDependencies
  | (() => OptimizationWebMcpDependencies);

/** Named readonly handles for the five page-scoped Optimization descriptors. */
export type OptimizationWebMcpTools = Readonly<{
  readonly setOptimizationConfig: WebMCP.ModelContextTool;
  readonly getOptimizationConfig: WebMCP.ModelContextTool;
  readonly evaluateOptimizationOperands: WebMCP.ModelContextTool;
  readonly executeOptimization: WebMCP.ModelContextTool;
  readonly applyOptimizationToEditor: WebMCP.ModelContextTool;
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

function currentDependencies(
  source: OptimizationWebMcpDependenciesSource,
): OptimizationWebMcpDependencies {
  return typeof source === "function" ? source() : source;
}

/** Creates strict descriptors bound to one live Optimization page. */
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
        dependencies.optimizationStore
          .getState()
          .setOptimizationConfig(
            input as OptimizationRunConfig,
            dependencies.catalogs,
          );
        const config = dependencies.optimizationStore
          .getState()
          .buildOptimizationConfig(dependencies.catalogs);
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
        const dependencies = currentDependencies(source);
        const config = dependencies.optimizationStore
          .getState()
          .buildOptimizationConfig(dependencies.catalogs);
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
        return JSON.stringify(report);
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
        return JSON.stringify(report);
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
  };
}

/** Alias using the all-capitals acronym used by the composition hook. */
export const createOptimizationWebMCPTools = createOptimizationWebMcpTools;
