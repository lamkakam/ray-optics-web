import type { RadiusMode, RadiusModeDraft } from "@/features/optimization/stores/optimizationStore";

export type ModalModeChoice = "constant" | "variable" | "pickup";

export type SourceSurfaceSelectOption = {
  readonly value: number;
  readonly label: string;
};

export const MODAL_MODE_OPTIONS = [
  { value: "constant", label: "constant" },
  { value: "variable", label: "variable" },
  { value: "pickup", label: "pickup" },
] as const;

export const CURVATURE_RADIUS_GUIDANCE_TEXT = [
  "R = 0 means a flat surface (infinite radius).",
  "Use variable bounds entirely below 0 or entirely above 0; do not straddle 0.",
] as const;

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
