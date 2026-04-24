import type { LeastSquaresMethod } from "@/shared/lib/types/optimization";

export interface OptimizationMethodCapabilities {
  readonly canUseBounds: boolean;
  readonly requiresResidualCountAtLeastVariableCount: boolean;
}

const METHOD_CAPABILITIES: Record<LeastSquaresMethod, OptimizationMethodCapabilities> = {
  trf: {
    canUseBounds: true,
    requiresResidualCountAtLeastVariableCount: false,
  },
  lm: {
    canUseBounds: false,
    requiresResidualCountAtLeastVariableCount: true,
  },
};

export function getOptimizationMethodCapabilities(method: LeastSquaresMethod): OptimizationMethodCapabilities {
  return METHOD_CAPABILITIES[method];
}
