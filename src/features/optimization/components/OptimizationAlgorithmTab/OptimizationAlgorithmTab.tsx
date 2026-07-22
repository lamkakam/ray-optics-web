"use client";

import { Input } from "@/shared/components/primitives/Input";
import { Label } from "@/shared/components/primitives/Label";
import { Select } from "@/shared/components/primitives/Select";
import { OPTIMIZER_UI_CONFIG } from "@/features/optimization/lib/optimizerUiConfig";
import type { LeastSquaresMethod, OptimizationConfig, OptimizerKind } from "@/features/optimization/types/optimizationWorkerTypes";

type SharedOptimizerConfig = OptimizationConfig["optimizer"];
type OptimizerFormStateByConfig<TConfig extends SharedOptimizerConfig> = {
  readonly [TKey in keyof TConfig]: TConfig[TKey] extends number ? string : TConfig[TKey];
};
type OptimizerFormState<TConfig extends SharedOptimizerConfig = SharedOptimizerConfig> =
  TConfig extends SharedOptimizerConfig ? OptimizerFormStateByConfig<TConfig> : never;
type OptimizerToleranceKind<TConfig extends SharedOptimizerConfig = SharedOptimizerConfig> =
  TConfig extends SharedOptimizerConfig ? Exclude<keyof TConfig, "kind" | "method" | "max_nfev"> : never;

interface OptimizationAlgorithmTabProps {
  readonly optimizer: OptimizerFormState;
  readonly onChangeOptimizer: (patch: Partial<OptimizerFormState>) => void;
}

function getToleranceValue(optimizer: OptimizerFormState, toleranceKind: OptimizerToleranceKind): string {
  return (optimizer as unknown as Record<OptimizerToleranceKind, string>)[toleranceKind];
}

function createTolerancePatch(
  toleranceKind: OptimizerToleranceKind,
  value: string,
): Partial<OptimizerFormState> {
  return { [toleranceKind]: value } as Partial<OptimizerFormState>;
}

/**
 * Renders the optimizer configuration form for the Algorithm tab while leaving state ownership in the parent page.
 *
 * @remarks
 * - Uses the drawer panel padding provided by the parent layout and does not add its own outer `p-4` wrapper.
 * - Reads optimizer kind labels, method options, and tolerance field labels from `features/optimization/lib/optimizerUiConfig.ts`.
 * - Imports optimization worker-boundary optimizer types from `features/optimization/types/optimizationWorkerTypes.ts`.
 * - Uses the shared `OptimizationConfig["optimizer"]` attribute names for form state. Numeric optimizer fields are represented as strings for inputs, so the tab reads and patches `max_nfev`, `ftol`, `xtol`, `gtol`, `tol`, and `atol` directly.
 * - The Optimizer Kind select is controlled by the parent and emits kind changes so the store can reset kind-specific algorithm defaults.
 * - The Method select is rendered only for method-based optimizers. Least squares supports both `Trust Region Reflective` (`trf`) and `Levenberg-Marquardt` (`lm`) through the centralized optimizer UI metadata.
 * - Differential Evolution is methodless and renders only `Max. num of steps`, `Relative tolerance`, and `Absolute tolerance`.
 * - Keeps `Max. num of steps` as a separately rendered field rather than treating it as metadata-driven.
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
      <div>
        <Label htmlFor="optimizer-max-steps">Max. num of steps</Label>
        <Input
          id="optimizer-max-steps"
          aria-label="Max. num of steps"
          value={optimizer.max_nfev}
          onChange={(event) => onChangeOptimizer({ max_nfev: event.target.value })}
        />
      </div>
      {optimizerConfig.tolerances.map((tolerance) => {
        return (
          <div key={tolerance.kind}>
            <Label htmlFor={`optimizer-${tolerance.kind}`}>{tolerance.label}</Label>
            <Input
              id={`optimizer-${tolerance.kind}`}
              aria-label={tolerance.label}
              value={getToleranceValue(optimizer, tolerance.kind)}
              onChange={(event) => onChangeOptimizer(createTolerancePatch(tolerance.kind, event.target.value))}
            />
          </div>
        );
      })}
    </div>
  );
}
