/**
 * Grid-row scaling dispatch over the surface-property registry. Each property's
 * descriptor owns its scaling (linear dimensions multiply by the factor, asphere
 * coefficients divide by the factor raised to their radial order minus one, and
 * angles, densities, and dimensionless values are preserved). The same registry
 * drives finite/underflow validation coverage, so every registered number is
 * checked, including preserved ones.
 */
import type { GridRow } from "@/shared/lib/lens-prescription-grid/types/gridTypes";
import {
  collectImageNumbers,
  collectSurfaceNumbers,
  scaleImage,
  scaleSurface,
} from "@/shared/lib/optical-model/operations/surfaceProperties";

/** Object distances at or above this value represent infinity and are preserved during scaling. */
export const OBJECT_DISTANCE_INFINITY_THRESHOLD = 1e10;

/** Scales finite object distances below the infinity threshold and preserves larger values. */
export function scaleObjectDistance(distance: number, factor: number): number {
  return distance < OBJECT_DISTANCE_INFINITY_THRESHOLD
    ? distance * factor
    : distance;
}

/** Dispatches scaling by grid-row kind: Object distance, or every registered Image or Surface property. */
export function scaleSurfaceValueRow(
  row: Extract<GridRow, { kind: "object" }>,
  factor: number,
): Extract<GridRow, { kind: "object" }>;
export function scaleSurfaceValueRow(
  row: Extract<GridRow, { kind: "image" }>,
  factor: number,
): Extract<GridRow, { kind: "image" }>;
export function scaleSurfaceValueRow(
  row: Extract<GridRow, { kind: "surface" }>,
  factor: number,
): Extract<GridRow, { kind: "surface" }>;
export function scaleSurfaceValueRow(row: GridRow, factor: number): GridRow;
export function scaleSurfaceValueRow(row: GridRow, factor: number): GridRow {
  if (row.kind === "object") {
    return {
      ...row,
      objectDistance: scaleObjectDistance(row.objectDistance, factor),
    };
  }

  if (row.kind === "image") {
    return scaleImage(row, factor);
  }

  return scaleSurface(row, factor);
}

/** Collects every registered numeric value of a row, including preserved fields, for finite and precision-underflow validation. */
export function collectSurfaceScalingNumericValues(row: GridRow): number[] {
  if (row.kind === "object") {
    return [row.objectDistance];
  }

  return row.kind === "image"
    ? collectImageNumbers(row)
    : collectSurfaceNumbers(row);
}
