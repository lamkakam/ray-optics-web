/** Pure draft, validation, and source-option helpers shared by optimization variable and pickup modals. */
import type { RadiusMode, RadiusModeDraft } from "@/features/optimization/stores/optimizationStore";
import type { SourceSurfaceSelectOption } from "@/features/optimization/types/optimizationModalTypes";

/** Ordered constant, variable, and pickup choices used by optimization mode controls. */
export const MODAL_MODE_OPTIONS = [
  { value: "constant", label: "constant" },
  { value: "variable", label: "variable" },
  { value: "pickup", label: "pickup" },
] as const;

/** Shared flat-surface and zero-straddling guidance shown by radius-like variable editors. */
export const CURVATURE_RADIUS_GUIDANCE_TEXT = [
  "R = 0 means a flat surface (infinite radius).",
  "Use variable bounds entirely below 0 or entirely above 0; do not straddle 0.",
] as const;

/** Validation rule that returns its first user-facing bounds error or `undefined`. */
export type VariableBoundsValidationRule = (
  label: string,
  minValue: string,
  maxValue: string,
) => string | undefined;

/** Rejects non-finite bounds or a minimum that is not strictly less than the maximum. */
export const minLessThanMaxRule: VariableBoundsValidationRule = (label, minValue, maxValue) => {
  const min = Number(minValue);
  const max = Number(maxValue);

  if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
    return `${label} variable bounds must have Min. less than Max.`;
  }

  return undefined;
};

/** Reports whether finite curvature-radius bounds span zero, where zero represents an infinite-radius flat surface. */
export function curvatureRadiusCrossesZero(minValue: string, maxValue: string): boolean {
  const min = Number(minValue);
  const max = Number(maxValue);

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return false;
  }

  return min < 0 && max > 0;
}

/** Builds the shared one-side-of-zero bounds error for a labeled radius-like field. */
export function getCurvatureRadiusBoundsErrorText(label: string): string {
  return `${label} variable bounds must stay on one side of 0.`;
}

/** Rejects curvature-radius bounds that span zero. */
export const curvatureRadiusNoZeroStraddleRule: VariableBoundsValidationRule = (label, minValue, maxValue) => {
  if (curvatureRadiusCrossesZero(minValue, maxValue)) {
    return getCurvatureRadiusBoundsErrorText(label);
  }

  return undefined;
};

/** Applies bounds rules in order and returns the first error. */
export function validateVariableBounds(
  label: string,
  minValue: string,
  maxValue: string,
  rules: ReadonlyArray<VariableBoundsValidationRule>,
): string | undefined {
  for (const rule of rules) {
    const errorText = rule(label, minValue, maxValue);
    if (errorText !== undefined) {
      return errorText;
    }
  }

  return undefined;
}

/** Creates a variable-mode draft initialized to one numeric value. */
export function createVariableDraft(value: number): RadiusModeDraft {
  return {
    mode: "variable",
    min: String(value),
    max: String(value),
  };
}

/** Creates the default pickup-mode draft. */
export function createPickupDraft(): RadiusModeDraft {
  return {
    mode: "pickup",
    sourceSurfaceIndex: "1",
    scale: "1",
    offset: "0",
  };
}

/** Builds radius pickup sources, including Image and excluding the target surface. */
export function getRadiusPickupSourceSurfaceOptions(
  realSurfaceCount: number,
  targetSurfaceIndex: number,
): SourceSurfaceSelectOption[] {
  return Array.from({ length: realSurfaceCount + 1 }, (_, index) => {
    const surfaceIndex = index + 1;
    return {
      value: surfaceIndex,
      label: surfaceIndex === realSurfaceCount + 1 ? "Image" : String(surfaceIndex),
    };
  }).filter((option) => option.value !== targetSurfaceIndex);
}

/** Builds physical-surface thickness pickup sources, excluding the target surface. */
export function getThicknessPickupSourceSurfaceOptions(
  realSurfaceCount: number,
  targetSurfaceIndex: number,
): SourceSurfaceSelectOption[] {
  return Array.from({ length: realSurfaceCount }, (_, index) => {
    const surfaceIndex = index + 1;
    return {
      value: surfaceIndex,
      label: String(surfaceIndex),
    };
  }).filter((option) => option.value !== targetSurfaceIndex);
}

/** Converts a committed radius mode into editable string-valued modal state. */
export function toRadiusModeDraft(mode: RadiusMode): RadiusModeDraft {
  switch (mode.mode) {
    case "constant":
      return { mode: "constant" };
    case "variable":
      return {
        mode: "variable",
        min: mode.min,
        max: mode.max,
      };
    case "pickup":
      return {
        mode: "pickup",
        sourceSurfaceIndex: mode.sourceSurfaceIndex,
        scale: mode.scale,
        offset: mode.offset,
      };
  }
}

/** Creates a stable serialized representation of a committed radius mode. */
export function serializeRadiusMode(mode: RadiusMode): string {
  switch (mode.mode) {
    case "constant":
      return "constant";
    case "variable":
      return `variable:${mode.min}:${mode.max}`;
    case "pickup":
      return `pickup:${mode.sourceSurfaceIndex}:${mode.scale}:${mode.offset}`;
  }
}
