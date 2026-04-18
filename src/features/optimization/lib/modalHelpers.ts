import type { RadiusMode, RadiusModeDraft } from "@/features/optimization/stores/optimizationStore";

export type ModalModeChoice = "constant" | "variable" | "pickup";

export const MODAL_MODE_OPTIONS = [
  { value: "constant", label: "constant" },
  { value: "variable", label: "variable" },
  { value: "pickup", label: "pickup" },
] as const;

export function curvatureRadiusCrossesZero(minValue: string, maxValue: string): boolean {
  const min = Number(minValue);
  const max = Number(maxValue);

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return false;
  }

  return min < 0 && max > 0;
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
