/** TypeBox schemas and inferred types for a surface's diffractive element. */
import Type from "typebox";
import { finiteNumberSchema } from "@/shared/lib/optical-model/schema/primitives";

/** Ruled grating density and diffraction order. */
export const diffractionGratingSchema = Type.Object(
  {
    /** Line-pair density in cycles per millimetre. */
    lpmm: finiteNumberSchema,
    order: Type.Integer(),
  },
  { additionalProperties: false },
);

/** Strict optional diffraction-element wrapper; an empty wrapper is a valid no-op. */
export const diffractiveElementSchema = Type.Object(
  {
    /** Optional ruled diffraction grating applied as the surface phase element. */
    diffractionGrating: Type.Optional(diffractionGratingSchema),
  },
  { additionalProperties: false },
);

/** Surface grating density and diffraction order. */
export type DiffractionGrating = Type.Static<typeof diffractionGratingSchema>;

/** Optional diffractive-element wrapper carried by a surface. */
export type DiffractiveElement = Type.Static<typeof diffractiveElementSchema>;
