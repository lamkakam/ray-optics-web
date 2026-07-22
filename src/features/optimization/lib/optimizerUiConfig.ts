/**
# `features/optimization/lib/optimizerUiConfig.ts`

## Purpose

Centralizes optimizer UI metadata so the optimization algorithm tab, store defaults, and method capability lookup all read the same labels, defaults, and per-method capability flags.

## Key Behaviors

- Uses type definitions from `features/optimization/types/optimizationUiTypes.ts`.
- Derives method and tolerance key types from `features/optimization/types/optimizationWorkerTypes.ts` through the optimizer UI type module instead of restating unions locally.
- Constrains `methods[*].kind` to the valid method union for each optimizer kind when that optimizer exposes methods.
- Constrains `tolerances[*].kind` to numeric optimizer fields other than `kind`, `method`, and `max_nfev`.
- Supports two metadata shapes:
  method-based optimizers expose `methods[*].canUseBounds` and `methods[*].requiresResidualCountAtLeastVariableCount`
  methodless optimizers omit `methods` and instead expose top-level `canUseBounds` and `requiresResidualCountAtLeastVariableCount`
- Requires `least_squares` to remain method-based inside `OptimizerUiConfig`, while allowing other optimizer kinds to use either metadata shape in the future.
- Stores least-squares method labels, capability flags, and tolerance labels/defaults in one UI-facing config object.
- Stores Differential Evolution as a methodless optimizer with `canUseBounds: true`, no residual-count dimension rule, and only `tol` / `atol` tolerance fields exposed as `Relative tolerance` and `Absolute tolerance`.*/
import type { OptimizerKind } from "@/features/optimization/types/optimizationWorkerTypes";
import type {
  OptimizerUiConfig,
  OptimizerUiMetadata,
  OptimizerUiMetadataWithMethods,
} from "@/features/optimization/types/optimizationUiTypes";

export function optimizerUiMetadataHasMethods<TKind extends OptimizerKind>(
  metadata: OptimizerUiMetadata<TKind>,
): metadata is OptimizerUiMetadataWithMethods<TKind> {
  return metadata.methods !== undefined;
}

export const OPTIMIZER_UI_CONFIG = {
  least_squares: {
    label: "Least Squares",
    methods: [
      {
        kind: "trf",
        canUseBounds: true,
        requiresResidualCountAtLeastVariableCount: false,
        label: "Trust Region Reflective",
      },
      {
        kind: "lm",
        canUseBounds: false,
        requiresResidualCountAtLeastVariableCount: true,
        label: "Levenberg-Marquardt",
      },
    ],
    tolerances: [
      { kind: "ftol", label: "Merit function change tolerance", default: 1e-5 },
      { kind: "xtol", label: "Independent variable change tolerance", default: 1e-5 },
      { kind: "gtol", label: "Gradient tolerance", default: 1e-5 },
    ],
  },
  differential_evolution: {
    label: "Differential Evolution",
    canUseBounds: true,
    requiresResidualCountAtLeastVariableCount: false,
    tolerances: [
      { kind: "tol", label: "Relative tolerance", default: 0.01 },
      { kind: "atol", label: "Absolute tolerance", default: 0 },
    ],
  },
} satisfies OptimizerUiConfig;

export function formatOptimizerUiDefaultValue(value: number): string {
  return value.toExponential().replace(".0e", "e");
}
