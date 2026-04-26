"use client";

import { Input } from "@/shared/components/primitives/Input";
import { Label } from "@/shared/components/primitives/Label";
import { Select } from "@/shared/components/primitives/Select";
import { OPTIMIZER_UI_CONFIG } from "@/features/optimization/lib/optimizerUiConfig";
import type { LeastSquaresMethod, OptimizationConfig, OptimizerKind } from "@/shared/lib/types/optimization";

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
