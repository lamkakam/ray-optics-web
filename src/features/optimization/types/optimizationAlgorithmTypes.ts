import type { LeastSquaresMethod, OptimizerKind } from "@/features/optimization/types/optimizationWorkerTypes";

export interface OptimizationMethodCapabilities {
  readonly canUseBounds: boolean;
  readonly requiresResidualCountAtLeastVariableCount: boolean;
}

export type OptimizationAlgorithmSelection =
  | { readonly kind: "least_squares"; readonly method: LeastSquaresMethod }
  | { readonly kind: Exclude<OptimizerKind, "least_squares"> };
