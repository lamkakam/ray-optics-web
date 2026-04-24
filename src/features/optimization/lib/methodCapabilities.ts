import type { LeastSquaresMethod } from "@/shared/lib/types/optimization";
import { OPTIMIZER_UI_CONFIG } from "@/features/optimization/lib/optimizerUiConfig";

export interface OptimizationMethodCapabilities {
  readonly canUseBounds: boolean;
  readonly requiresResidualCountAtLeastVariableCount: boolean;
}

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
