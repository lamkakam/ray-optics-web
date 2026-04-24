"use client";

import React from "react";
import { Input } from "@/shared/components/primitives/Input";
import { Label } from "@/shared/components/primitives/Label";
import { Select } from "@/shared/components/primitives/Select";
import { OPTIMIZER_UI_CONFIG } from "@/features/optimization/lib/optimizerUiConfig";
import type { LeastSquaresMethod, OptimizerKind } from "@/shared/lib/types/optimization";

interface OptimizerFormState {
  readonly kind: OptimizerKind;
  readonly method: LeastSquaresMethod;
  readonly maxNumSteps: string;
  readonly meritFunctionTolerance: string;
  readonly independentVariableTolerance: string;
  readonly gradientTolerance: string;
}

interface OptimizationAlgorithmTabProps {
  readonly optimizer: OptimizerFormState;
  readonly onChangeOptimizer: (patch: Partial<OptimizerFormState>) => void;
}

const TOLERANCE_FIELD_BY_KIND = {
  ftol: "meritFunctionTolerance",
  xtol: "independentVariableTolerance",
  gtol: "gradientTolerance",
} satisfies Record<
  (typeof OPTIMIZER_UI_CONFIG)["least_squares"]["tolerances"][number]["kind"],
  keyof Pick<
    OptimizerFormState,
    "meritFunctionTolerance" | "independentVariableTolerance" | "gradientTolerance"
  >
>;

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
          onChange={() => undefined}
        />
      </div>
      <div>
        <Label htmlFor="optimizer-method">Method</Label>
        <Select
          id="optimizer-method"
          aria-label="Method"
          value={optimizer.method}
          options={optimizerConfig.methods.map((method) => ({ label: method.label, value: method.kind }))}
          onChange={(event) => onChangeOptimizer({ method: event.target.value as LeastSquaresMethod })}
        />
      </div>
      <div>
        <Label htmlFor="optimizer-max-steps">Max. num of steps</Label>
        <Input
          id="optimizer-max-steps"
          aria-label="Max. num of steps"
          value={optimizer.maxNumSteps}
          onChange={(event) => onChangeOptimizer({ maxNumSteps: event.target.value })}
        />
      </div>
      {optimizerConfig.tolerances.map((tolerance) => {
        const field = TOLERANCE_FIELD_BY_KIND[tolerance.kind];

        return (
          <div key={tolerance.kind}>
            <Label htmlFor={`optimizer-${tolerance.kind}`}>{tolerance.label}</Label>
            <Input
              id={`optimizer-${tolerance.kind}`}
              aria-label={tolerance.label}
              value={optimizer[field]}
              onChange={(event) => onChangeOptimizer({ [field]: event.target.value })}
            />
          </div>
        );
      })}
    </div>
  );
}
