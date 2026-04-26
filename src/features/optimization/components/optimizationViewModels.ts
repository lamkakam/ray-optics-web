"use client";

import type { GridRow } from "@/shared/lib/types/gridTypes";
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
