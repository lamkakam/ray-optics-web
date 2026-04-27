import type {
  AsphericalType,
  DecenterConfig,
  DiffractionGrating,
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
