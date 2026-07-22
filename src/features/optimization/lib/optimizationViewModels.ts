"use client";
/** Shared optimization row contracts and display-formatting helpers. */

import type { GridRow } from "@/shared/lib/lens-prescription-grid/types/gridTypes";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import type { OptimizationOperandKind, OptimizationResidualEntry } from "@/features/optimization/types/optimizationWorkerTypes";
import { getOptimizationOperandMetadata } from "@/features/optimization/lib/operandMetadata";

/** One field- or wavelength-weight grid row. */
export interface WeightRow {
  readonly id: string;
  readonly index: number;
  readonly label: string;
  readonly weight: number;
}

/** One prescription row with its applicable radius or thickness surface index. */
export interface RadiusRow {
  readonly id: string;
  readonly radiusSurfaceIndex?: number;
  readonly thicknessSurfaceIndex?: number;
  readonly row: GridRow;
}

/** Formatted operand-evaluation row ready for display. */
export interface EvaluationRow {
  readonly id: string;
  readonly operandType: string;
  readonly target: string;
  readonly weight: string;
  readonly value: string;
}

/** Returns whether a residual remains visible after combined weighting. */
export function hasVisibleEvaluationWeight(residual: OptimizationResidualEntry): boolean {
  return residual.total_weight !== 0;
}

/** Returns the physical surface label or the Image label for an image-surface index. */
export function getRadiusLabel(surfaceIndex: number, model: OpticalModel): string {
  if (surfaceIndex === model.surfaces.length + 1) {
    return "Image";
  }

  return model.surfaces[surfaceIndex - 1]?.label ?? `Surface ${surfaceIndex}`;
}

/** Returns a physical or image-surface curvature radius, defaulting missing physical data to zero. */
export function getRadiusValue(model: OpticalModel, surfaceIndex: number): number {
  if (surfaceIndex === model.surfaces.length + 1) {
    return model.image.curvatureRadius;
  }

  return model.surfaces[surfaceIndex - 1]?.curvatureRadius ?? 0;
}

/** Returns a physical-surface thickness, defaulting missing data to zero. */
export function getThicknessValue(model: OpticalModel, surfaceIndex: number): number {
  return model.surfaces[surfaceIndex - 1]?.thickness ?? 0;
}

/** Returns the canonical user-facing label for an operand kind. */
export function getOperandLabel(kind: OptimizationOperandKind): string {
  return getOptimizationOperandMetadata(kind).label;
}

function formatEvaluationValue(value: number | undefined): string {
  return value === undefined ? "N/A" : String(value);
}

function formatEvaluationFixedValue(value: number | undefined): string {
  return value === undefined ? "" : value.toFixed(6);
}

/** Formats a non-zero-weight residual for the evaluation grid; returns `undefined` for hidden zero-weight terms. */
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
