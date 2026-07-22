/**
Pure helper utilities shared by optimization variable/pickup modals.

## Behavior

- `validateVariableBounds()` applies rules sequentially and stops at the first returned error string. This lets callers prioritize min/max ordering before field-specific rules such as curvature-radius zero-straddling.
- `minLessThanMaxRule` formats errors as `{label} variable bounds must have Min. less than Max.` when either bound is non-finite or the numeric minimum is greater than or equal to the numeric maximum.
- `CURVATURE_RADIUS_GUIDANCE_TEXT`, `getCurvatureRadiusBoundsErrorText()`, and `curvatureRadiusNoZeroStraddleRule` are shared by `features/optimization/components/LensPrescriptionGrid/RadiusModeModal/RadiusModeModal.tsx` and the toroid-sweep variable row in `features/optimization/components/LensPrescriptionGrid/AsphereVarModal/AsphereVarModal.tsx` so the flat-surface guidance and zero-crossing error copy stay in sync.
- `curvatureRadiusCrossesZero()` is intended for curvature-radius style bounds, where `R = 0` represents a flat surface with infinite radius and bounds must stay entirely negative or entirely positive.
- The draft builders are shared by both `features/optimization/components/LensPrescriptionGrid/RadiusModeModal/RadiusModeModal.tsx` and `features/optimization/components/LensPrescriptionGrid/ThicknessModeModal/ThicknessModeModal.tsx` to keep default mode transitions consistent.
- The pickup source-surface option builders keep radius and thickness dropdown bounds consistent with their optimizer validation rules.*/
import type { RadiusMode, RadiusModeDraft } from "@/features/optimization/stores/optimizationStore";
import type { SourceSurfaceSelectOption } from "@/features/optimization/types/optimizationModalTypes";

export const MODAL_MODE_OPTIONS = [
  { value: "constant", label: "constant" },
  { value: "variable", label: "variable" },
  { value: "pickup", label: "pickup" },
] as const;

export const CURVATURE_RADIUS_GUIDANCE_TEXT = [
  "R = 0 means a flat surface (infinite radius).",
  "Use variable bounds entirely below 0 or entirely above 0; do not straddle 0.",
] as const;

export type VariableBoundsValidationRule = (
  label: string,
  minValue: string,
  maxValue: string,
) => string | undefined;

export const minLessThanMaxRule: VariableBoundsValidationRule = (label, minValue, maxValue) => {
  const min = Number(minValue);
  const max = Number(maxValue);

  if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
    return `${label} variable bounds must have Min. less than Max.`;
  }

  return undefined;
};

export function curvatureRadiusCrossesZero(minValue: string, maxValue: string): boolean {
  const min = Number(minValue);
  const max = Number(maxValue);

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return false;
  }

  return min < 0 && max > 0;
}

export function getCurvatureRadiusBoundsErrorText(label: string): string {
  return `${label} variable bounds must stay on one side of 0.`;
}

export const curvatureRadiusNoZeroStraddleRule: VariableBoundsValidationRule = (label, minValue, maxValue) => {
  if (curvatureRadiusCrossesZero(minValue, maxValue)) {
    return getCurvatureRadiusBoundsErrorText(label);
  }

  return undefined;
};

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

export function createVariableDraft(value: number): RadiusModeDraft {
  return {
    mode: "variable",
    min: String(value),
    max: String(value),
  };
}

export function createPickupDraft(): RadiusModeDraft {
  return {
    mode: "pickup",
    sourceSurfaceIndex: "1",
    scale: "1",
    offset: "0",
  };
}

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
