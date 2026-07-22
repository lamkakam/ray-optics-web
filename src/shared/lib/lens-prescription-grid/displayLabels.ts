/**
# `shared/lib/lens-prescription-grid/displayLabels.ts`

Shared display labels for modal-backed lens prescription grid text action cells.

## Exports

- `EMPTY_LENS_PRESCRIPTION_CELL_LABEL` — `"None"` for absent optional prescription configuration.
- `ASPHERICAL_TYPE_LABELS` — maps each `AsphericalType` to its UI label: `Conic`, `Even Aspherical`, `Radial Polynomial`, `X Toroid`, and `Y Toroid`.
- `ASPHERICAL_TYPE_OPTIONS` — select options derived from `ASPHERICAL_TYPE_LABELS` so the grid and `AsphericalModal` cannot drift.
- `formatApertureLabel(clearAperture, edgeAperture)` — returns compact aperture text for the grid's Aperture cell. A missing clear aperture and a centered circular clear aperture both display as `Default` when the edge aperture is missing/default. A nonzero circular clear aperture offset displays `Cir offset (<x>, <y>)`. Annular clear apertures display `Annu obs <radius>` and append `, offset (<x>, <y>)` when offset. Rectangular clear apertures display `Rect (<xHalfWidth>,<yHalfWidth>)` and append nonzero `rot <rotation>°` and/or offset suffixes. Explicit circular edge apertures append `; Edge Cir <radius>` and append `, offset (<x>, <y>)` when offset. Explicit rectangular edge apertures append `; Edge Rect (<xHalfWidth>,<yHalfWidth>)` with the same optional rotation and offset suffixes.
- `formatAsphericalLabel(aspherical)` — returns the asphere type label or `None`.
- `formatDecenterLabel(decenter)` — returns `coordinateSystemStrategy` or `None`.
- `formatDiffractionGratingLabel(diffractionGrating)` — returns `${lpmm} lp/mm` or `None`.
*/
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
