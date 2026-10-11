/**
 * Pure registry of optimizable constructional parameters. Every surface property
 * is either set by a registered parameter shape or listed in
 * `OPTIMIZATION_OPT_OUTS` with the reason it is not continuously optimized, so a
 * new property must decide its optimizability explicitly.
 */
import type Type from "typebox";
import type { OpticalModel } from "@/shared/lib/optical-model/model/opticalModel";
import {
  asphereCoefficientParameterShape,
  asphereScalarParameterShape,
} from "@/shared/lib/optical-model/surface-properties/aspherical/aspherical.optimization";
import { coreParameterShape } from "@/shared/lib/optical-model/surface-properties/core/core.optimization";
import { decenterParameterShape } from "@/shared/lib/optical-model/surface-properties/decenter/decenter.optimization";
import type { SurfacePropertyKey } from "@/shared/lib/optical-model/surface-properties/descriptor";
import type {
  ConstructionalParameterShape,
  ParameterRefOf,
} from "@/shared/lib/optical-model/surface-properties/parameterShape";

/** Every continuously optimizable parameter shape, in wire-schema branch order. */
export const CONSTRUCTIONAL_PARAMETER_SHAPES = [
  coreParameterShape,
  asphereScalarParameterShape,
  asphereCoefficientParameterShape,
  decenterParameterShape,
] as const;

/** Surface properties that no continuous parameter shape sets, with the reason. */
export const OPTIMIZATION_OPT_OUTS = {
  label: "not a constructional parameter",
  comment: "not a constructional parameter",
  semiDiameter: "an aperture size, not a constructional parameter",
  clear_aperture: "an aperture, not a constructional parameter",
  edge_aperture: "an aperture, not a constructional parameter",
  medium: "categorical; optimized by Glass Expert candidate substitution",
  manufacturer: "categorical; optimized by Glass Expert candidate substitution",
  diffractiveElement:
    "grating line density (lines/mm) and diffraction order are fixed design inputs, not optimized",
} as const satisfies Partial<Record<SurfacePropertyKey, string>>;

type RegisteredShape = (typeof CONSTRUCTIONAL_PARAMETER_SHAPES)[number];

/** Distributes a reference or pickup-source type over the registered shapes. */
type RefOfShape<TShape> =
  TShape extends ConstructionalParameterShape<infer TRef, Type.TProperties>
    ? ParameterRefOf<TRef>
    : never;

type PickupOfShape<TShape> =
  TShape extends ConstructionalParameterShape<infer TRef, infer TPickupSource>
    ? ParameterRefOf<TRef> & ParameterRefOf<TPickupSource>
    : never;

/** Wire reference to one optimizable constructional parameter: kind, surface index, and qualifiers. */
export type ConstructionalParameterRef = RefOfShape<RegisteredShape>;

/** Wire reference plus the shape's extra pickup-source fields (for example `source_coefficient_index`). */
export type ConstructionalParameterPickupRef = PickupOfShape<RegisteredShape>;

/** Every optimizable constructional parameter kind on the wire. */
export type ConstructionalParameterKind = ConstructionalParameterRef["kind"];

/** Returns the kinds accepted by a shape's `kind` schema (`enum` or `const`). */
export function parameterKindsOf(
  shape: RegisteredShape,
): readonly ConstructionalParameterKind[] {
  const kindSchema = shape.ref.kind as {
    readonly enum?: readonly ConstructionalParameterKind[];
    readonly const?: ConstructionalParameterKind;
  };
  return (
    kindSchema.enum ??
    (kindSchema.const === undefined ? [] : [kindSchema.const])
  );
}

const SHAPE_BY_KIND = new Map<ConstructionalParameterKind, RegisteredShape>(
  CONSTRUCTIONAL_PARAMETER_SHAPES.flatMap((shape) =>
    parameterKindsOf(shape).map((kind) => [kind, shape] as const),
  ),
);

/** Returns `model` with the referenced constructional parameter set to `value`, using its owning shape. */
export function applyParameterValue(
  model: OpticalModel,
  ref: ConstructionalParameterRef,
  value: number,
): OpticalModel {
  const shape = SHAPE_BY_KIND.get(ref.kind);
  if (shape === undefined) {
    throw new Error(`Unknown constructional parameter kind: ${ref.kind}`);
  }
  // The kind lookup guarantees `ref` matches the shape's reference type.
  return (
    shape.applyValue as (
      model: OpticalModel,
      ref: ConstructionalParameterRef,
      value: number,
    ) => OpticalModel
  )(model, ref, value);
}
