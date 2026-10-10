/** TypeBox schemas and inferred types for a surface's clear and edge apertures. */
import Type from "typebox";
import {
  finiteNumberSchema,
  positiveFiniteNumberSchema,
} from "@/shared/lib/optical-model/schema/primitives";

const strict = { additionalProperties: false } as const;

const offsetProperties = {
  offsetX: finiteNumberSchema,
  offsetY: finiteNumberSchema,
};

const rectangularApertureSchema = Type.Object(
  {
    shape: Type.Literal("rectangular"),
    xHalfWidth: positiveFiniteNumberSchema,
    yHalfWidth: positiveFiniteNumberSchema,
    /** In-plane rotation in degrees. */
    rotation: finiteNumberSchema,
    ...offsetProperties,
  },
  strict,
);

/**
 * Supported circular, annular, rectangular, and Ronchi clear apertures with signed
 * offsets. Circular, annular, and Ronchi outer radii come from the surface
 * semi-diameter; an annular obstruction must stay below that semi-diameter.
 */
export const clearApertureSchema = Type.Union([
  Type.Object({ shape: Type.Literal("circular"), ...offsetProperties }, strict),
  Type.Object(
    {
      shape: Type.Literal("annular"),
      // `$data` points from the obstruction radius back to the owning surface's semi-diameter.
      obstructionRadius: Type.Unsafe<number>({
        ...positiveFiniteNumberSchema,
        exclusiveMaximum: { $data: "2/semiDiameter" },
      }),
      ...offsetProperties,
    },
    strict,
  ),
  rectangularApertureSchema,
  Type.Object(
    {
      shape: Type.Literal("ronchi"),
      /** Line-pair density in cycles per millimetre. */
      lpmm: positiveFiniteNumberSchema,
      /** In-plane rotation in degrees; zero produces vertical lines. */
      rotation: finiteNumberSchema,
      ...offsetProperties,
    },
    strict,
  ),
]);

/** Supported circular and rectangular edge apertures; omission means follow the clear aperture. */
export const edgeApertureSchema = Type.Union([
  Type.Object(
    {
      shape: Type.Literal("circular"),
      radius: positiveFiniteNumberSchema,
      ...offsetProperties,
    },
    strict,
  ),
  rectangularApertureSchema,
]);

/** Circular, annular, rectangular, or Ronchi clear aperture with signed offsets. */
export type ClearAperture = Type.Static<typeof clearApertureSchema>;

/** Explicit circular or rectangular edge aperture; omission means follow the clear aperture. */
export type EdgeAperture = Type.Static<typeof edgeApertureSchema>;

/** Annular clear aperture whose outer radius comes from the surface semi-diameter. */
export type AnnularAperture = Extract<ClearAperture, { shape: "annular" }>;

/** Rotated rectangular aperture dimensions. */
export type RectangularAperture = Extract<
  ClearAperture,
  { shape: "rectangular" }
>;

/** Binary Ronchi ruling whose circular outer radius comes from the surface semi-diameter. */
export type RonchiRulingAperture = Extract<ClearAperture, { shape: "ronchi" }>;
