/**
 * Provides the shared optimizer-capability lookup used by the optimization UI and store validation.
 *
 * @remarks
 * Type definitions for capability return values and algorithm selections live in `features/optimization/types/optimizationAlgorithmTypes.ts`.
 *
 * ## Key Behaviors
 *
 * - Derives both least-squares capability flags from `optimizerUiConfig.ts` so UI rendering and config validation do not drift.
 * - `trf` reports `canUseBounds: true` and does not enforce the Levenberg-Marquardt residual-dimension rule.
 * - `lm` reports `canUseBounds: false` and does enforce `residuals >= variables`.
 * - `differential_evolution` reports `canUseBounds: true` and does not enforce the least-squares residual-count dimension rule.
 * - Keeps `getOptimizationMethodCapabilities()` for least-squares method callers and `getOptimizationAlgorithmCapabilities()` for optimizer-kind-aware callers.
 */
import { OPTIMIZER_UI_CONFIG } from "@/features/optimization/lib/optimizerUiConfig";
import type {
  OptimizationAlgorithmSelection,
  OptimizationMethodCapabilities,
} from "@/features/optimization/types/optimizationAlgorithmTypes";
import type { LeastSquaresMethod } from "@/features/optimization/types/optimizationWorkerTypes";

const METHOD_CAPABILITIES: Record<LeastSquaresMethod, OptimizationMethodCapabilities> =
  OPTIMIZER_UI_CONFIG.least_squares.methods.reduce<Record<LeastSquaresMethod, OptimizationMethodCapabilities>>(
    (capabilities, method) => ({
      ...capabilities,
      [method.kind]: {
        canUseBounds: method.canUseBounds,
        requiresResidualCountAtLeastVariableCount: method.requiresResidualCountAtLeastVariableCount,
      },
    }),
    {} as Record<LeastSquaresMethod, OptimizationMethodCapabilities>,
  );

export function getOptimizationMethodCapabilities(method: LeastSquaresMethod): OptimizationMethodCapabilities {
  return METHOD_CAPABILITIES[method];
}

export function getOptimizationAlgorithmCapabilities(
  selection: OptimizationAlgorithmSelection,
): OptimizationMethodCapabilities {
  if (selection.kind === "least_squares") {
    return METHOD_CAPABILITIES[selection.method];
  }

  const metadata = OPTIMIZER_UI_CONFIG[selection.kind];

  return {
    canUseBounds: metadata.canUseBounds,
    requiresResidualCountAtLeastVariableCount: metadata.requiresResidualCountAtLeastVariableCount,
  };
}
