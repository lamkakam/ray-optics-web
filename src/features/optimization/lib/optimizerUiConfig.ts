import type { OptimizerKind } from "@/features/optimization/type/optimizationWorkerTypes";
import type {
  OptimizerUiConfig,
  OptimizerUiMetadata,
  OptimizerUiMetadataWithMethods,
} from "@/features/optimization/type/optimizationUiTypes";

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
