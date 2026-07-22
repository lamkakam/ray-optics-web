/** Shared display labels for modal-backed lens prescription grid text action cells. */
import type {
  AsphericalType,
  ClearAperture,
  DecenterConfig,
  DiffractionGrating,
  EdgeAperture,
  Surface,
} from "@/shared/lib/types/opticalModel";

export const EMPTY_LENS_PRESCRIPTION_CELL_LABEL = "None";

export const ASPHERICAL_TYPE_LABELS = {
  Conic: "Conic",
  EvenAspherical: "Even Aspherical",
  RadialPolynomial: "Radial Polynomial",
  XToroid: "X Toroid",
  YToroid: "Y Toroid",
} satisfies Record<AsphericalType, string>;

export const ASPHERICAL_TYPE_OPTIONS = Object.entries(ASPHERICAL_TYPE_LABELS).map(([value, label]) => ({
  value: value as AsphericalType,
  label,
}));

export function formatAsphericalLabel(aspherical: Surface["aspherical"] | undefined): string {
  return aspherical === undefined ? EMPTY_LENS_PRESCRIPTION_CELL_LABEL : ASPHERICAL_TYPE_LABELS[aspherical.kind];
}

export function formatDecenterLabel(decenter: DecenterConfig | undefined): string {
  return decenter === undefined ? EMPTY_LENS_PRESCRIPTION_CELL_LABEL : decenter.coordinateSystemStrategy;
}

export function formatDiffractionGratingLabel(diffractionGrating: DiffractionGrating | undefined): string {
  return diffractionGrating === undefined
    ? EMPTY_LENS_PRESCRIPTION_CELL_LABEL
    : `${diffractionGrating.lpmm} lp/mm`;
}

function hasOffset(aperture: Pick<ClearAperture, "offsetX" | "offsetY">): boolean {
  return aperture.offsetX !== 0 || aperture.offsetY !== 0;
}

function formatOffset(aperture: Pick<ClearAperture, "offsetX" | "offsetY">): string {
  return `offset (${aperture.offsetX}, ${aperture.offsetY})`;
}

function formatRectangularSuffix(aperture: Extract<ClearAperture | EdgeAperture, { shape: "rectangular" }>): string {
  const suffixes = [
    aperture.rotation !== 0 ? `rot ${aperture.rotation}°` : undefined,
    hasOffset(aperture) ? formatOffset(aperture) : undefined,
  ].filter((suffix): suffix is string => suffix !== undefined);

  return suffixes.length === 0 ? "" : `, ${suffixes.join(", ")}`;
}

function formatClearApertureLabel(clearAperture: ClearAperture | undefined): string {
  if (clearAperture === undefined) return "Default";

  if (clearAperture.shape === "circular") {
    return hasOffset(clearAperture) ? `Cir ${formatOffset(clearAperture)}` : "Default";
  }

  if (clearAperture.shape === "rectangular") {
    return `Rect (${clearAperture.xHalfWidth},${clearAperture.yHalfWidth})${formatRectangularSuffix(clearAperture)}`;
  }

  const baseLabel = `Annu obs ${clearAperture.obstructionRadius}`;
  return hasOffset(clearAperture) ? `${baseLabel}, ${formatOffset(clearAperture)}` : baseLabel;
}

function formatEdgeApertureLabel(edgeAperture: EdgeAperture): string {
  if (edgeAperture.shape === "rectangular") {
    return `Edge Rect (${edgeAperture.xHalfWidth},${edgeAperture.yHalfWidth})${formatRectangularSuffix(edgeAperture)}`;
  }

  const baseLabel = `Edge Cir ${edgeAperture.radius}`;
  return hasOffset(edgeAperture) ? `${baseLabel}, ${formatOffset(edgeAperture)}` : baseLabel;
}

export function formatApertureLabel(
  clearAperture: ClearAperture | undefined,
  edgeAperture: EdgeAperture | undefined,
): string {
  const clearLabel = formatClearApertureLabel(clearAperture);
  return edgeAperture === undefined ? clearLabel : `${clearLabel}; ${formatEdgeApertureLabel(edgeAperture)}`;
}
