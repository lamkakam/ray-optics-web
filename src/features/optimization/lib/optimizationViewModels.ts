/**
 * Shared optimization UI row types and formatting helpers used by the page and extracted view components.
 *
 * @remarks
 * ## Behavior
 *
 * - `createEvaluationRow(...)` returns a formatted row only when the residual `total_weight` is non-zero.
 * - Imports optimization residual and operand kind types from `features/optimization/types/optimizationWorkerTypes.ts`.
 * - Operand labels are resolved through shared optimization operand metadata so selector labels and evaluation labels stay aligned.
 * - Evaluation-row `target` is rendered as `"N/A"` when a residual omits `target`, which is the display path used by target-less operands such as Ray Fan variants.
 * - Evaluation-row `weight` and `value` are rendered as fixed 6-decimal strings for the operand evaluation table.
 * - Residuals with `total_weight === 0` are treated as hidden UI rows so the evaluation table omits terms disabled by zero operand, field, or wavelength weights.
 */
"use client";

import type { GridRow } from "@/shared/lib/lens-prescription-grid/types/gridTypes";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import type { OptimizationOperandKind, OptimizationResidualEntry } from "@/features/optimization/types/optimizationWorkerTypes";
import { getOptimizationOperandMetadata } from "@/features/optimization/lib/operandMetadata";

export interface WeightRow {
  readonly id: string;
  readonly index: number;
  readonly label: string;
  readonly weight: number;
}

export interface RadiusRow {
  readonly id: string;
  readonly radiusSurfaceIndex?: number;
  readonly thicknessSurfaceIndex?: number;
  readonly row: GridRow;
}

export interface EvaluationRow {
  readonly id: string;
  readonly operandType: string;
  readonly target: string;
  readonly weight: string;
  readonly value: string;
}

export function hasVisibleEvaluationWeight(residual: OptimizationResidualEntry): boolean {
  return residual.total_weight !== 0;
}

export function getRadiusLabel(surfaceIndex: number, model: OpticalModel): string {
  if (surfaceIndex === model.surfaces.length + 1) {
    return "Image";
  }

  return model.surfaces[surfaceIndex - 1]?.label ?? `Surface ${surfaceIndex}`;
}

export function getRadiusValue(model: OpticalModel, surfaceIndex: number): number {
  if (surfaceIndex === model.surfaces.length + 1) {
    return model.image.curvatureRadius;
  }

  return model.surfaces[surfaceIndex - 1]?.curvatureRadius ?? 0;
}

export function getThicknessValue(model: OpticalModel, surfaceIndex: number): number {
  return model.surfaces[surfaceIndex - 1]?.thickness ?? 0;
}

export function getOperandLabel(kind: OptimizationOperandKind): string {
  return getOptimizationOperandMetadata(kind).label;
}

function formatEvaluationValue(value: number | undefined): string {
  return value === undefined ? "N/A" : String(value);
}

function formatEvaluationFixedValue(value: number | undefined): string {
  return value === undefined ? "" : value.toFixed(6);
}

export function createEvaluationRow(residual: OptimizationResidualEntry, index: number): EvaluationRow | undefined {
  if (!hasVisibleEvaluationWeight(residual)) {
    return undefined;
  }

  return {
    id: `${residual.kind}-${residual.field_index ?? "none"}-${residual.wavelength_index ?? "none"}-${index}`,
    operandType: getOperandLabel(residual.kind as OptimizationOperandKind),
    target: formatEvaluationValue(residual.target),
    weight: formatEvaluationFixedValue(residual.total_weight),
    value: formatEvaluationFixedValue(residual.value),
  };
}
