/**
 * TypeBox schemas, and the types inferred from them, for optical system
 * specifications. Collection limits and wavelength-reference validation live
 * here so JSON imports, parsed TXT models, and imperative tools share one contract.
 */
import Type from "typebox";
import { finiteNumberSchema } from "@/shared/lib/optical-model/schema/primitives";

const fieldSamplesSchema = Type.Array(finiteNumberSchema, {
  minItems: 1,
  maxItems: 10,
});

const objectFieldProperties = {
  space: Type.Literal("object"),
  type: Type.Enum(["angle", "height"], { type: "string" }),
  fields: fieldSamplesSchema,
  isWideAngle: Type.Optional(Type.Boolean()),
};

const imageFieldProperties = {
  space: Type.Literal("image"),
  type: Type.Literal("height"),
  fields: fieldSamplesSchema,
  isWideAngle: Type.Optional(Type.Boolean()),
};

const relativeFieldProperties = {
  maxField: finiteNumberSchema,
  isRelative: Type.Literal(true),
};

const absoluteFieldProperties = {
  // Absolute samples are already physical, so `maxField` is forbidden (`maxField?: never`).
  maxField: Type.Optional(Type.Never()),
  isRelative: Type.Literal(false),
};

const strict = { additionalProperties: false } as const;

// Unions of object branches keep a top-level `type: "object"` because WebMCP tool
// input schemas, which reuse the pupil and half-field schemas, must be object schemas.
const objectUnion = { type: "object" } as const;

/** Strict Object EPD/NA or Image F/# pupil specification; cross-space combinations are invalid. */
export const pupilSpecSchema = Type.Union(
  [
    Type.Object(
      {
        space: Type.Literal("object"),
        type: Type.Enum(["epd", "NA"], { type: "string" }),
        value: finiteNumberSchema,
      },
      strict,
    ),
    Type.Object(
      {
        space: Type.Literal("image"),
        type: Type.Literal("f/#"),
        value: finiteNumberSchema,
      },
      strict,
    ),
  ],
  objectUnion,
);

const relativeFieldBranches = [
  Type.Object({ ...objectFieldProperties, ...relativeFieldProperties }, strict),
  Type.Object({ ...imageFieldProperties, ...relativeFieldProperties }, strict),
] as const;

/**
 * Imported field specification. Object space accepts angle or height and image
 * space accepts only height. Relative samples require `maxField`; absolute
 * samples are already physical and forbid it. `isWideAngle` is optional.
 */
export const fieldSpecSchema = Type.Union(
  [
    ...relativeFieldBranches,
    Type.Object(
      { ...objectFieldProperties, ...absoluteFieldProperties },
      strict,
    ),
    Type.Object(
      { ...imageFieldProperties, ...absoluteFieldProperties },
      strict,
    ),
  ],
  objectUnion,
);

/** WebMCP half-field specification restricted to relative samples. */
export const relativeFieldSpecSchema = Type.Union(
  [...relativeFieldBranches],
  objectUnion,
);

/** Strict wavelength/weight collection with an in-range zero-based reference. */
export const wavelengthsSpecSchema = Type.Object(
  {
    /** Wavelength/weight pairs: `[wavelength in nm, weight]`. */
    weights: Type.Array(Type.Tuple([finiteNumberSchema, finiteNumberSchema]), {
      minItems: 1,
      maxItems: 7,
    }),
    /** Zero-based index into `weights`. */
    referenceIndex: Type.Integer({ minimum: 0 }),
  },
  { additionalProperties: false, referenceIndexInRange: true },
);

/** Reusable OpticalSpecs schema; imported fields may be absolute. */
export const opticalSpecsSchema = Type.Object(
  {
    /** Object EPD, exact Object NA, or geometric Image F/#. */
    pupil: pupilSpecSchema,
    /** Object height/angle or exact real Image Height samples. */
    field: fieldSpecSchema,
    /** Wavelength/weight pairs and their zero-based reference index. */
    wavelengths: wavelengthsSpecSchema,
  },
  strict,
);

/** Supported physical pupil definitions; cross-space combinations are invalid. */
export type PupilSpec = Type.Static<typeof pupilSpecSchema>;

/** Supported physical field definition with strictly discriminated relative or absolute samples and optional exact wide-angle handling. */
export type FieldSpec = Type.Static<typeof fieldSpecSchema>;

/** Optical system specifications using only physically resolved combinations. */
export type OpticalSpecs = Type.Static<typeof opticalSpecsSchema>;
