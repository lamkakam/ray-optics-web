/**
 * TypeBox schemas for the sequential optical model, composed from the
 * per-property surface schemas. They are the single source of truth for both the
 * TypeScript types in `opticalModel.ts` and the strict AJV validators in
 * `schema/validators.ts`. Every object rejects unknown keys, so format evolution
 * requires an explicit schema-versioning decision.
 */
import Type from "typebox";
import { setAutoApertureFlagSchema } from "@/shared/lib/optical-model/model/apertureFlag";
import {
  finiteNumberSchema,
  positiveFiniteNumberSchema,
} from "@/shared/lib/optical-model/schema/primitives";
import { opticalSpecsSchema } from "@/shared/lib/optical-model/specs/opticalSpecsSchema";
import {
  clearApertureSchema,
  edgeApertureSchema,
} from "@/shared/lib/optical-model/surface-properties/aperture/aperture.schema";
import { asphericalSchema } from "@/shared/lib/optical-model/surface-properties/aspherical/aspherical.schema";
import { decenterConfigSchema } from "@/shared/lib/optical-model/surface-properties/decenter/decenter.schema";
import { diffractiveElementSchema } from "@/shared/lib/optical-model/surface-properties/diffractive-element/diffractiveElement.schema";

/**
 * Strict physical-surface schema. A Ronchi clear aperture additionally requires a
 * positive semi-diameter, because the ruling's outer radius comes from it.
 * Property order is the order WebMCP lists updatable and clearable fields.
 */
export const surfaceSchema = Type.Object(
  {
    label: Type.Enum(["Default", "Stop"], { type: "string" }),
    /** Optional single-line, untrimmed annotation retained only by the web application. */
    comment: Type.Optional(Type.String()),
    /** Zero means flat (infinite radius). */
    curvatureRadius: finiteNumberSchema,
    thickness: finiteNumberSchema,
    /** A medium name, `"air"`, or `"REFL"` for reflection. */
    medium: Type.String(),
    /** Empty when the medium is air or reflective. */
    manufacturer: Type.String(),
    semiDiameter: finiteNumberSchema,
    /** Optional discriminated aspherical surface configuration. */
    aspherical: Type.Optional(asphericalSchema),
    decenter: Type.Optional(decenterConfigSchema),
    /** Optional diffractive-element wrapper; an empty wrapper is a valid no-op. */
    diffractiveElement: Type.Optional(diffractiveElementSchema),
    /** Clear aperture; circular, annular, and Ronchi outer radii come from `semiDiameter`. */
    clear_aperture: Type.Optional(clearApertureSchema),
    /** Explicit edge aperture, or `undefined` to follow the clear aperture. */
    edge_aperture: Type.Optional(edgeApertureSchema),
  },
  {
    additionalProperties: false,
    allOf: [
      {
        if: {
          required: ["clear_aperture"],
          properties: {
            clear_aperture: {
              type: "object",
              required: ["shape"],
              properties: { shape: { const: "ronchi" } },
            },
          },
        },
        then: { properties: { semiDiameter: positiveFiniteNumberSchema } },
      },
    ],
  },
);

/** Strict object-space gap with a non-reflective medium. */
export const objectPrescriptionSchema = Type.Object(
  {
    distance: finiteNumberSchema,
    medium: Type.String({ not: { enum: ["REFL", "refl"] } }),
    manufacturer: Type.String(),
  },
  { additionalProperties: false },
);

/** Strict image-plane schema. */
export const imagePrescriptionSchema = Type.Object(
  {
    /** Zero means flat (infinite radius). */
    curvatureRadius: finiteNumberSchema,
    decenter: Type.Optional(decenterConfigSchema),
  },
  { additionalProperties: false },
);

/** Complete external prescription schema: object plane, ordered physical surfaces, and image plane. */
export const lensPrescriptionSchema = Type.Object(
  {
    object: objectPrescriptionSchema,
    surfaces: Type.Array(surfaceSchema),
    image: imagePrescriptionSchema,
  },
  { additionalProperties: false },
);

/**
 * Complete imported optical model. `specs.field.isWideAngle` remains optional for
 * legacy files; pupil and field keys accept only physically resolved combinations.
 */
export const opticalModelSchema = Type.Object(
  {
    /** Whether RayOptics recomputes semi-diameters or preserves manual values. */
    setAutoAperture: setAutoApertureFlagSchema,
    specs: opticalSpecsSchema,
    object: objectPrescriptionSchema,
    image: imagePrescriptionSchema,
    surfaces: Type.Array(surfaceSchema),
  },
  { additionalProperties: false },
);
