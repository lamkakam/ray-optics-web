/**
 * Centralizes optimizer UI metadata so the optimization algorithm tab, store defaults, and method capability lookup all read the same labels, defaults, and per-method capability flags.
 *
 * @remarks
 * ## Key Behaviors
 *
 * - Uses type definitions from `features/optimization/types/optimizationUiTypes.ts`.
 * - Derives method and numeric-field key types from `features/optimization/types/optimizationWorkerTypes.ts` through the optimizer UI type module instead of restating unions locally.
 * - Constrains `methods[*].kind` to the valid method union for each optimizer kind when that optimizer exposes methods.
 * - Constrains `numericFields[*].kind` to numeric optimizer fields other than `kind` and `method`.
 * - Supports two metadata shapes:
 * method-based optimizers expose `methods[*].canUseBounds`, `methods[*].canOptimizeGlass`, and `methods[*].requiresResidualCountAtLeastVariableCount`
 * methodless optimizers omit `methods` and instead expose the same capabilities at the top level
 * - Requires `least_squares` to remain method-based inside `OptimizerUiConfig`, while allowing other optimizer kinds to use either metadata shape in the future.
 * - Stores every numeric field's label, default, and validation category in one UI-facing config object; the Algorithm component does not special-case Glass Expert controls.
 * - Existing continuous optimizers expose `canOptimizeGlass: false`.
 * - Stores Glass Expert as a methodless optimizer with required bounds, glass substitution enabled, no residual-count dimension rule, and `num_neighbours`, `maxiter`, and `tol` fields; `maxiter` is labeled as the per-refinement-run limit.
 */
import type { OptimizerKind } from "@/features/optimization/types/optimizationWorkerTypes";
import type {
  OptimizerUiConfig,
  OptimizerUiMetadata,
  OptimizerUiMetadataWithMethods,
} from "@/features/optimization/types/optimizationUiTypes";

/** Narrows optimizer metadata to the method-based shape. */
export function optimizerUiMetadataHasMethods<TKind extends OptimizerKind>(
  metadata: OptimizerUiMetadata<TKind>,
): metadata is OptimizerUiMetadataWithMethods<TKind> {
  return metadata.methods !== undefined;
}

/** Canonical labels, numeric fields, methods, defaults, and capabilities for every optimizer. */
export const OPTIMIZER_UI_CONFIG = {
  least_squares: {
    label: "Least Squares",
    methods: [
      {
        kind: "trf",
        canUseBounds: true,
        canOptimizeGlass: false,
        requiresResidualCountAtLeastVariableCount: false,
        label: "Trust Region Reflective",
      },
      {
        kind: "lm",
        canUseBounds: false,
        canOptimizeGlass: false,
        requiresResidualCountAtLeastVariableCount: true,
        label: "Levenberg-Marquardt",
      },
    ],
    numericFields: [
      { kind: "max_nfev", label: "Max. num of steps", default: 200, validation: "positiveInteger" },
      { kind: "ftol", label: "Merit function change tolerance", default: 1e-5, validation: "leastSquaresTolerance" },
      { kind: "xtol", label: "Independent variable change tolerance", default: 1e-5, validation: "leastSquaresTolerance" },
      { kind: "gtol", label: "Gradient tolerance", default: 1e-5, validation: "leastSquaresTolerance" },
    ],
  },
  differential_evolution: {
    label: "Differential Evolution",
    canUseBounds: true,
    canOptimizeGlass: false,
    requiresResidualCountAtLeastVariableCount: false,
    numericFields: [
      { kind: "max_nfev", label: "Max. num of steps", default: 200, validation: "positiveInteger" },
      { kind: "tol", label: "Relative tolerance", default: 0.01, validation: "positiveFloat" },
      { kind: "atol", label: "Absolute tolerance", default: 0, validation: "nonNegativeFloat" },
    ],
  },
  glass_expert: {
    label: "Glass Expert",
    canUseBounds: true,
    canOptimizeGlass: true,
    requiresResidualCountAtLeastVariableCount: false,
    numericFields: [
      { kind: "num_neighbours", label: "Num. of neighbours", default: 7, validation: "positiveInteger" },
      { kind: "maxiter", label: "Max. iterations per refinement run", default: 1000, validation: "positiveInteger" },
      { kind: "tol", label: "Tolerance", default: 1e-3, validation: "positiveFloat" },
    ],
  },
} satisfies OptimizerUiConfig;

/** Formats a numeric optimizer default for an editable string field. */
export function formatOptimizerUiDefaultValue(value: number): string {
  return value.toExponential().replace(".0e", "e");
}
