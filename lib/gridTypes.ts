import type { Surface, Surfaces } from "./opticalModel";

export const OBJECT_ROW_ID = "row-object";
export const IMAGE_ROW_ID = "row-image";

export type GridRow = { readonly id: string } & (
  | { readonly kind: "object"; objectDistance: Surfaces["object"]["distance"] }
  | ({ readonly kind: "image" } & Surfaces["image"])
  | ({ readonly kind: "surface" } & Surface)
);
