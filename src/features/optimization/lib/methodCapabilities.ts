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
