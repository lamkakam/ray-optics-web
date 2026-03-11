export const OBJECT_ROW_ID = "row-object";
export const IMAGE_ROW_ID = "row-image";

export type GridRow = { readonly id: string } & (
  | { readonly kind: "object"; objectDistance: number }
  | { readonly kind: "image"; curvatureRadius: number }
  | {
      readonly kind: "surface";
      label: "Default" | "Stop";
      curvatureRadius: number;
      thickness: number;
      medium: string;
      manufacturer: string;
      semiDiameter: number;
      aspherical?: {
        conicConstant: number;
        polynomialCoefficients?: number[];
      };
      decenter?: {
        posAndOrientation: "bend" | "dec and return" | "decenter" | "reverse";
        alpha: number;
        beta: number;
        gamma: number;
        offsetX: number;
        offsetY: number;
      };
    }
);
