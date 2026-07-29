"use client";

import { Input } from "@/shared/components/primitives/Input";
import { Label } from "@/shared/components/primitives/Label";
import { Select } from "@/shared/components/primitives/Select";
import { OPTIMIZER_UI_CONFIG } from "@/features/optimization/lib/optimizerUiConfig";
import type {
  LeastSquaresMethod,
  OptimizationAlgorithmConfig,
  OptimizerKind,
} from "@/features/optimization/types/optimizationWorkerTypes";

type SharedOptimizerConfig = OptimizationAlgorithmConfig;
type OptimizerFormStateByConfig<TConfig extends SharedOptimizerConfig> = {
  readonly [TKey in keyof TConfig]: TConfig[TKey] extends number ? string : TConfig[TKey];
};
type OptimizerFormState<TConfig extends SharedOptimizerConfig = SharedOptimizerConfig> =
  TConfig extends SharedOptimizerConfig ? OptimizerFormStateByConfig<TConfig> : never;
type OptimizerNumericFieldKind<TConfig extends SharedOptimizerConfig = SharedOptimizerConfig> =
  TConfig extends SharedOptimizerConfig ? Exclude<keyof TConfig, "kind" | "method"> : never;

interface OptimizationAlgorithmTabProps {
  readonly optimizer: OptimizerFormState;
  readonly onChangeOptimizer: (patch: Partial<OptimizerFormState>) => void;
}

function getNumericFieldValue(optimizer: OptimizerFormState, fieldKind: OptimizerNumericFieldKind): string {
  return (optimizer as unknown as Record<OptimizerNumericFieldKind, string>)[fieldKind];
}

function createNumericFieldPatch(
  fieldKind: OptimizerNumericFieldKind,
  value: string,
): Partial<OptimizerFormState> {
  return { [fieldKind]: value } as Partial<OptimizerFormState>;
}

/**
 * Renders the optimizer configuration form for the Algorithm tab while leaving state ownership in the parent page.
 *
 * @remarks
 * - Uses the drawer panel padding provided by the parent layout and does not add its own outer `p-4` wrapper.
 * - Reads optimizer kind labels, method options, and every numeric field label/default contract from `features/optimization/lib/optimizerUiConfig.ts`.
 * - Imports optimization worker-boundary optimizer types from `features/optimization/types/optimizationWorkerTypes.ts`.
 * - Uses the shared `OptimizationAlgorithmConfig` attribute names for form state. Numeric optimizer fields are represented as strings for inputs.
 * - The Optimizer Kind select is controlled by the parent and emits kind changes so the store can reset kind-specific algorithm defaults.
 * - The Method select is rendered only for method-based optimizers. Least squares supports both `Trust Region Reflective` (`trf`) and `Levenberg-Marquardt` (`lm`) through the centralized optimizer UI metadata.
 * - Differential Evolution and Glass Expert are methodless. Glass Expert renders `Num. of neighbours`, `Max. iterations per refinement run`, and `Tolerance`.
 * - All numeric controls, including continuous `max_nfev`, are rendered from metadata rather than hardcoded by optimizer kind.
 */
export function OptimizationAlgorithmTab({
  optimizer,
  onChangeOptimizer,
}: OptimizationAlgorithmTabProps) {
  const optimizerConfig = OPTIMIZER_UI_CONFIG[optimizer.kind];

  return (
    <div data-testid="optimization-algorithm-tab" className="grid gap-4 md:grid-cols-2">
      <div>
        <Label htmlFor="optimizer-kind">Optimizer Kind</Label>
        <Select
          id="optimizer-kind"
          aria-label="Optimizer Kind"
          value={optimizer.kind}
          options={Object.entries(OPTIMIZER_UI_CONFIG).map(([kind, config]) => ({
            label: config.label,
            value: kind,
          }))}
          onChange={(event) => onChangeOptimizer({ kind: event.target.value as OptimizerKind })}
        />
      </div>
      {optimizer.kind === "least_squares" ? (
        <div>
          <Label htmlFor="optimizer-method">Method</Label>
          <Select
            id="optimizer-method"
            aria-label="Method"
            value={optimizer.method}
            options={OPTIMIZER_UI_CONFIG.least_squares.methods.map((method) => ({ label: method.label, value: method.kind }))}
            onChange={(event) => onChangeOptimizer({ method: event.target.value as LeastSquaresMethod })}
          />
        </div>
      ) : undefined}
      {optimizerConfig.numericFields.map((field) => {
        return (
          <div key={field.kind}>
            <Label htmlFor={`optimizer-${field.kind}`}>{field.label}</Label>
            <Input
              id={`optimizer-${field.kind}`}
              aria-label={field.label}
              value={getNumericFieldValue(optimizer, field.kind)}
              onChange={(event) => onChangeOptimizer(createNumericFieldPatch(field.kind, event.target.value))}
            />
          </div>
        );
      })}
    </div>
  );
}
