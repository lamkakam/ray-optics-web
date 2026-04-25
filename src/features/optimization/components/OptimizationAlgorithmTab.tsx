"use client";

import React from "react";
import { Input } from "@/shared/components/primitives/Input";
import { Label } from "@/shared/components/primitives/Label";
import { Select } from "@/shared/components/primitives/Select";
import { OPTIMIZER_UI_CONFIG } from "@/features/optimization/lib/optimizerUiConfig";
import type { LeastSquaresMethod, OptimizerKind } from "@/shared/lib/types/optimization";

type OptimizerFormState =
  | {
      readonly kind: "least_squares";
      readonly method: LeastSquaresMethod;
      readonly maxNumSteps: string;
      readonly meritFunctionTolerance: string;
      readonly independentVariableTolerance: string;
      readonly gradientTolerance: string;
    }
  | {
      readonly kind: "differential_evolution";
      readonly maxNumSteps: string;
      readonly relativeTolerance: string;
      readonly absoluteTolerance: string;
    };

interface OptimizationAlgorithmTabProps {
  readonly optimizer: OptimizerFormState;
  readonly onChangeOptimizer: (patch: Partial<OptimizerFormState>) => void;
}

const TOLERANCE_FIELD_BY_KIND = {
  ftol: "meritFunctionTolerance",
  xtol: "independentVariableTolerance",
  gtol: "gradientTolerance",
  tol: "relativeTolerance",
  atol: "absoluteTolerance",
} as const;

type OptimizerToleranceKind = keyof typeof TOLERANCE_FIELD_BY_KIND;

function getToleranceValue(optimizer: OptimizerFormState, toleranceKind: OptimizerToleranceKind): string {
  if (optimizer.kind === "least_squares") {
    if (toleranceKind === "ftol") {
      return optimizer.meritFunctionTolerance;
    }
    if (toleranceKind === "xtol") {
      return optimizer.independentVariableTolerance;
    }
    if (toleranceKind === "gtol") {
      return optimizer.gradientTolerance;
    }
  }

  if (optimizer.kind === "differential_evolution") {
    if (toleranceKind === "tol") {
      return optimizer.relativeTolerance;
    }
    if (toleranceKind === "atol") {
      return optimizer.absoluteTolerance;
    }
  }

  throw new Error(`Optimizer kind "${optimizer.kind}" does not expose tolerance "${toleranceKind}".`);
}

function createTolerancePatch(
  toleranceKind: OptimizerToleranceKind,
  value: string,
): Partial<OptimizerFormState> {
  const field = TOLERANCE_FIELD_BY_KIND[toleranceKind];
  return { [field]: value } as Partial<OptimizerFormState>;
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
          value={optimizer.maxNumSteps}
          onChange={(event) => onChangeOptimizer({ maxNumSteps: event.target.value })}
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
