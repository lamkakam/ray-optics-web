/**
# `features/optimization/types/optimizationAlgorithmTypes.ts`

## Purpose

Optimization algorithm selection and capability types used by runtime capability helpers and their callers.

## Key Conventions

- `OptimizationAlgorithmSelection` preserves the least-squares method discriminator while allowing methodless optimizer kinds to be selected by `kind` only.
- Runtime capability lookup and config data stay in `features/optimization/lib/`.*/
import type { LeastSquaresMethod, OptimizerKind } from "@/features/optimization/types/optimizationWorkerTypes";

export interface OptimizationMethodCapabilities {
  readonly canUseBounds: boolean;
  readonly requiresResidualCountAtLeastVariableCount: boolean;
}

export type OptimizationAlgorithmSelection =
  | { readonly kind: "least_squares"; readonly method: LeastSquaresMethod }
  | { readonly kind: Exclude<OptimizerKind, "least_squares"> };
