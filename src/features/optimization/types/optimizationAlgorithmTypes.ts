/** Optimization algorithm selections and runtime capability results. */
import type { LeastSquaresMethod, OptimizerKind } from "@/features/optimization/types/optimizationWorkerTypes";

/** Bounds and residual-dimension capabilities used by optimization validation and UI rendering. */
export interface OptimizationMethodCapabilities {
  readonly canUseBounds: boolean;
  readonly requiresResidualCountAtLeastVariableCount: boolean;
}

/** Least-squares selections retain their method discriminator; methodless optimizers are selected by kind alone. */
export type OptimizationAlgorithmSelection =
  | { readonly kind: "least_squares"; readonly method: LeastSquaresMethod }
  | { readonly kind: Exclude<OptimizerKind, "least_squares"> };
