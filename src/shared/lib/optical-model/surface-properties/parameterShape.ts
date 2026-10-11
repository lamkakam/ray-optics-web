/**
 * Pure contract for addressing optimizable constructional parameters on the
 * optimizer wire format. A parameter shape belongs to the surface-property
 * folder that owns it and declares, once, the snake_case reference fields
 * (`kind`, `surface_index`, and qualifiers such as `asphere_kind`), any extra
 * pickup-source fields, and how a solved value is written back to the model.
 * Optimization variable, pickup, and report types and their AJV schemas are all
 * derived from these shapes.
 */
import Type from "typebox";
import type {
  OpticalModel,
  Surface,
  Surfaces,
} from "@/shared/lib/optical-model/model/opticalModel";
import type { SurfacePropertyKey } from "@/shared/lib/optical-model/surface-properties/descriptor";

/** Non-negative integer surface index used on the optimizer wire format. */
export const parameterSurfaceIndexSchema = Type.Integer({ minimum: 0 });

/** Wire reference addressing one constructional parameter of a shape. */
export type ParameterRefOf<TRef extends Type.TProperties> = Type.Static<
  Type.TObject<TRef>
>;

/** One family of constructional parameters sharing a wire reference shape. */
export interface ConstructionalParameterShape<
  TRef extends Type.TProperties,
  TPickupSource extends Type.TProperties,
> {
  /** Surface properties whose values these parameters set. */
  readonly properties: readonly SurfacePropertyKey[];
  /** Reference fields: a `kind` discriminator, `surface_index`, and qualifiers. */
  readonly ref: TRef;
  /** Pickup-source fields beyond `source_surface_index`, `scale`, and `offset`. */
  readonly pickupSource: TPickupSource;
  /** Returns the model with the referenced parameter set to `value`. */
  readonly applyValue: (
    model: OpticalModel,
    ref: ParameterRefOf<TRef>,
    value: number,
  ) => OpticalModel;
}

/** Declares a parameter shape with its reference and pickup-source types inferred. */
export function defineParameterShape<
  TRef extends Type.TProperties,
  TPickupSource extends Type.TProperties,
>(
  shape: ConstructionalParameterShape<TRef, TPickupSource>,
): ConstructionalParameterShape<TRef, TPickupSource> {
  return shape;
}

/** Returns `model` with 1-based physical surface `surfaceIndex` replaced by `update(surface)`. */
export function updateSurfaceAt(
  model: OpticalModel,
  surfaceIndex: number,
  update: (surface: Surface) => Surface,
): OpticalModel {
  return {
    ...model,
    surfaces: model.surfaces.map((surface, index) =>
      index === surfaceIndex - 1 ? update(surface) : surface,
    ),
  };
}

/**
 * Like `updateSurfaceAt`, but index `surfaces.length + 1` addresses the image
 * plane, which shares the curvature-radius and decenter properties.
 */
export function updateSurfaceOrImageAt(
  model: OpticalModel,
  surfaceIndex: number,
  update: <T extends Surface | Surfaces["image"]>(owner: T) => T,
): OpticalModel {
  if (surfaceIndex === model.surfaces.length + 1) {
    return { ...model, image: update(model.image) };
  }
  return updateSurfaceAt(model, surfaceIndex, update);
}
