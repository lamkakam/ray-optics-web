"use client";

import React from "react";
import { Input } from "@/shared/components/primitives/Input";
import { Label } from "@/shared/components/primitives/Label";
import { Select } from "@/shared/components/primitives/Select";

interface OptimizerFormState {
  readonly kind: "least_squares";
  readonly method: "trf";
  readonly maxNumSteps: string;
  readonly meritFunctionTolerance: string;
  readonly independentVariableTolerance: string;
  readonly gradientTolerance: string;
}

interface OptimizationAlgorithmTabProps {
  readonly optimizer: OptimizerFormState;
  readonly onChangeOptimizer: (patch: Partial<OptimizerFormState>) => void;
}

export function OptimizationAlgorithmTab({
  optimizer,
  onChangeOptimizer,
}: OptimizationAlgorithmTabProps) {
  return (
    <div data-testid="optimization-algorithm-tab" className="grid gap-4 md:grid-cols-2">
      <div>
        <Label htmlFor="optimizer-kind">Optimizer Kind</Label>
        <Select
          id="optimizer-kind"
          aria-label="Optimizer Kind"
          value={optimizer.kind}
          options={[{ label: "Least Squares", value: "least_squares" }]}
          onChange={() => undefined}
        />
      </div>
      <div>
        <Label htmlFor="optimizer-method">Method</Label>
        <Select
          id="optimizer-method"
          aria-label="Method"
          value={optimizer.method}
          options={[{ label: "Trust Region Reflective", value: "trf" }]}
          onChange={() => undefined}
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
      <div>
        <Label htmlFor="optimizer-ftol">Merit function change tolerance</Label>
        <Input
          id="optimizer-ftol"
          aria-label="Merit function change tolerance"
          value={optimizer.meritFunctionTolerance}
          onChange={(event) => onChangeOptimizer({ meritFunctionTolerance: event.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="optimizer-xtol">Independent variable change tolerance</Label>
        <Input
          id="optimizer-xtol"
          aria-label="Independent variable change tolerance"
          value={optimizer.independentVariableTolerance}
          onChange={(event) => onChangeOptimizer({ independentVariableTolerance: event.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="optimizer-gtol">Gradient tolerance</Label>
        <Input
          id="optimizer-gtol"
          aria-label="Gradient tolerance"
          value={optimizer.gradientTolerance}
          onChange={(event) => onChangeOptimizer({ gradientTolerance: event.target.value })}
        />
      </div>
    </div>
  );
}
