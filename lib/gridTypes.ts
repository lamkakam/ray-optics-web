export type SurfaceRowKind = "object" | "surface" | "image";

export const OBJECT_ROW_ID = "row-object";
export const IMAGE_ROW_ID = "row-image";

export interface GridRow {
  readonly id: string;
  readonly kind: SurfaceRowKind;
  objectDistance?: number;
  label?: "Default" | "Stop";
  curvatureRadius?: number;
  thickness?: number;
  medium?: string;
  manufacturer?: string;
  semiDiameter?: number;
  aspherical?: {
    conicConstant: number;
    polynomialCoefficients?: number[];
  };
}
