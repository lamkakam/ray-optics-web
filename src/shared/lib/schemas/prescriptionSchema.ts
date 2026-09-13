/**
 * Strict reusable schemas for the external lens-prescription contract. These are
 * shared by file import and WebMCP boundaries and compiled once per validator.
 * Optical-spec collection limits and wavelength-reference validation live here
 * so JSON imports, parsed TXT models, and imperative tools share one contract.
 */
import Ajv from "ajv";
import type { OpticalSpecs, Surfaces } from "@/shared/lib/types/opticalModel";

/** Creates the project AJV instance with finite-number and cross-field support. */
export function createPrescriptionAjv(): Ajv {
  const ajv = new Ajv({ $data: true });
  ajv.addKeyword({
    keyword: "finiteNumber",
    type: "number",
    validate: (_schema: boolean, data: number) => Number.isFinite(data),
  });
  ajv.addKeyword({
    keyword: "referenceIndexInRange",
    type: "object",
    schemaType: "boolean",
    validate: (
      _schema: boolean,
      data: { readonly weights?: unknown; readonly referenceIndex?: unknown },
    ) => {
      const referenceIndex = data.referenceIndex;
      return (
        Array.isArray(data.weights) &&
        typeof referenceIndex === "number" &&
        Number.isInteger(referenceIndex) &&
        referenceIndex >= 0 &&
        referenceIndex < data.weights.length
      );
    },
  });
  return ajv;
}

/** Numeric schema that rejects JavaScript non-finite values. */
export const finiteNumberSchema = {
  type: "number",
  finiteNumber: true,
} as const;
/** Finite-number schema constrained to values greater than zero. */
export const positiveFiniteNumberSchema = {
  ...finiteNumberSchema,
  exclusiveMinimum: 0,
} as const;

const objectFieldProperties = {
  space: { type: "string", const: "object" },
  type: { type: "string", enum: ["angle", "height"] },
  maxField: finiteNumberSchema,
  fields: {
    type: "array",
    minItems: 1,
    maxItems: 10,
    items: finiteNumberSchema,
  },
  isRelative: { type: "boolean" },
  isWideAngle: { type: "boolean" },
} as const;

const imageFieldProperties = {
  space: { type: "string", const: "image" },
  type: { type: "string", const: "height" },
  maxField: finiteNumberSchema,
  fields: {
    type: "array",
    minItems: 1,
    maxItems: 10,
    items: finiteNumberSchema,
  },
  isRelative: { type: "boolean" },
  isWideAngle: { type: "boolean" },
} as const;

/** Strict Object EPD/NA or Image F/# pupil specification. */
export const pupilSpecSchema = {
  type: "object",
  oneOf: [
    {
      type: "object",
      required: ["space", "type", "value"],
      additionalProperties: false,
      properties: {
        space: { type: "string", const: "object" },
        type: { type: "string", enum: ["epd", "NA"] },
        value: finiteNumberSchema,
      },
    },
    {
      type: "object",
      required: ["space", "type", "value"],
      additionalProperties: false,
      properties: {
        space: { type: "string", const: "image" },
        type: { type: "string", const: "f/#" },
        value: finiteNumberSchema,
      },
    },
  ],
} as const;

/** Imported field specification; absolute and relative samples remain compatible. */
export const fieldSpecSchema = {
  type: "object",
  oneOf: [
    {
      type: "object",
      required: ["space", "type", "maxField", "fields", "isRelative"],
      additionalProperties: false,
      properties: objectFieldProperties,
    },
    {
      type: "object",
      required: ["space", "type", "maxField", "fields", "isRelative"],
      additionalProperties: false,
      properties: imageFieldProperties,
    },
  ],
} as const;

/** WebMCP half-field specification restricted to relative samples. */
export const relativeFieldSpecSchema = {
  type: "object",
  oneOf: [
    {
      type: "object",
      required: ["space", "type", "maxField", "fields", "isRelative"],
      additionalProperties: false,
      properties: {
        ...objectFieldProperties,
        isRelative: { type: "boolean", const: true },
      },
    },
    {
      type: "object",
      required: ["space", "type", "maxField", "fields", "isRelative"],
      additionalProperties: false,
      properties: {
        ...imageFieldProperties,
        isRelative: { type: "boolean", const: true },
      },
    },
  ],
} as const;

const wavelengthWeightsSchema = {
  type: "array",
  minItems: 1,
  maxItems: 7,
  items: {
    type: "array",
    items: finiteNumberSchema,
    minItems: 2,
    maxItems: 2,
  },
} as const;

/** Strict wavelength/weight collection with an in-range zero-based reference. */
export const wavelengthsSpecSchema = {
  type: "object",
  required: ["weights", "referenceIndex"],
  additionalProperties: false,
  referenceIndexInRange: true,
  properties: {
    weights: wavelengthWeightsSchema,
    referenceIndex: { type: "integer", minimum: 0 },
  },
} as const;

/** Reusable OpticalSpecs schema; imported fields may be absolute. */
export const opticalSpecsSchema = {
  type: "object",
  required: ["pupil", "field", "wavelengths"],
  additionalProperties: false,
  properties: {
    pupil: pupilSpecSchema,
    field: fieldSpecSchema,
    wavelengths: wavelengthsSpecSchema,
  },
} as const;

/** Backwards-readable aliases for callers that name specs by their model type. */
export const fieldSchema = fieldSpecSchema;
export const halfFieldSchema = relativeFieldSpecSchema;
export const pupilSchema = pupilSpecSchema;
export const wavelengthsSchema = wavelengthsSpecSchema;

/** Strict schema for all supported decenter strategies and offsets. */
export const decenterConfigSchema = {
  type: "object",
  required: [
    "coordinateSystemStrategy",
    "alpha",
    "beta",
    "gamma",
    "offsetX",
    "offsetY",
  ],
  additionalProperties: false,
  properties: {
    coordinateSystemStrategy: {
      type: "string",
      enum: ["bend", "dec and return", "decenter", "reverse"],
    },
    alpha: finiteNumberSchema,
    beta: finiteNumberSchema,
    gamma: finiteNumberSchema,
    offsetX: finiteNumberSchema,
    offsetY: finiteNumberSchema,
  },
} as const;

/** Strict optional diffraction-element wrapper. */
export const diffractiveElementSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    diffractionGrating: {
      type: "object",
      required: ["lpmm", "order"],
      additionalProperties: false,
      properties: { lpmm: finiteNumberSchema, order: { type: "integer" } },
    },
  },
} as const;

const rectangularProperties = {
  shape: { type: "string", const: "rectangular" },
  xHalfWidth: positiveFiniteNumberSchema,
  yHalfWidth: positiveFiniteNumberSchema,
  rotation: finiteNumberSchema,
  offsetX: finiteNumberSchema,
  offsetY: finiteNumberSchema,
} as const;

/** Supported circular, annular, rectangular, and Ronchi clear apertures. */
export const clearApertureSchema = {
  oneOf: [
    {
      type: "object",
      required: ["shape", "offsetX", "offsetY"],
      additionalProperties: false,
      properties: {
        shape: { type: "string", const: "circular" },
        offsetX: finiteNumberSchema,
        offsetY: finiteNumberSchema,
      },
    },
    {
      type: "object",
      required: ["shape", "obstructionRadius", "offsetX", "offsetY"],
      additionalProperties: false,
      properties: {
        shape: { type: "string", const: "annular" },
        obstructionRadius: {
          ...positiveFiniteNumberSchema,
          exclusiveMaximum: { $data: "2/semiDiameter" },
        },
        offsetX: finiteNumberSchema,
        offsetY: finiteNumberSchema,
      },
    },
    {
      type: "object",
      required: [
        "shape",
        "xHalfWidth",
        "yHalfWidth",
        "rotation",
        "offsetX",
        "offsetY",
      ],
      additionalProperties: false,
      properties: rectangularProperties,
    },
    {
      type: "object",
      required: ["shape", "lpmm", "rotation", "offsetX", "offsetY"],
      additionalProperties: false,
      properties: {
        shape: { type: "string", const: "ronchi" },
        lpmm: positiveFiniteNumberSchema,
        rotation: finiteNumberSchema,
        offsetX: finiteNumberSchema,
        offsetY: finiteNumberSchema,
      },
    },
  ],
} as const;

/** Supported circular and rectangular edge apertures. */
export const edgeApertureSchema = {
  oneOf: [
    {
      type: "object",
      required: ["shape", "radius", "offsetX", "offsetY"],
      additionalProperties: false,
      properties: {
        shape: { type: "string", const: "circular" },
        radius: positiveFiniteNumberSchema,
        offsetX: finiteNumberSchema,
        offsetY: finiteNumberSchema,
      },
    },
    {
      type: "object",
      required: [
        "shape",
        "xHalfWidth",
        "yHalfWidth",
        "rotation",
        "offsetX",
        "offsetY",
      ],
      additionalProperties: false,
      properties: rectangularProperties,
    },
  ],
} as const;

const polynomialCoefficientsSchema = {
  type: "array",
  items: finiteNumberSchema,
  maxItems: 10,
} as const;
/** Supported discriminated conic, polynomial, and toroidal aspheres. */
export const asphericalSchema = {
  oneOf: [
    {
      type: "object",
      required: ["kind", "conicConstant"],
      additionalProperties: false,
      properties: {
        kind: { type: "string", const: "Conic" },
        conicConstant: finiteNumberSchema,
      },
    },
    ...(["EvenAspherical", "RadialPolynomial"] as const).map((kind) => ({
      type: "object",
      required: ["kind", "conicConstant", "polynomialCoefficients"],
      additionalProperties: false,
      properties: {
        kind: { type: "string", const: kind },
        conicConstant: finiteNumberSchema,
        polynomialCoefficients: polynomialCoefficientsSchema,
      },
    })),
    ...(["XToroid", "YToroid"] as const).map((kind) => ({
      type: "object",
      required: [
        "kind",
        "conicConstant",
        "toricSweepRadiusOfCurvature",
        "polynomialCoefficients",
      ],
      additionalProperties: false,
      properties: {
        kind: { type: "string", const: kind },
        conicConstant: finiteNumberSchema,
        toricSweepRadiusOfCurvature: finiteNumberSchema,
        polynomialCoefficients: polynomialCoefficientsSchema,
      },
    })),
  ],
} as const;

/** Strict physical-surface schema including all nested grid fields. */
export const surfaceSchema = {
  type: "object",
  required: [
    "label",
    "curvatureRadius",
    "thickness",
    "medium",
    "manufacturer",
    "semiDiameter",
  ],
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
  properties: {
    label: { type: "string", enum: ["Default", "Stop"] },
    comment: { type: "string" },
    curvatureRadius: finiteNumberSchema,
    thickness: finiteNumberSchema,
    medium: { type: "string" },
    manufacturer: { type: "string" },
    semiDiameter: finiteNumberSchema,
    aspherical: asphericalSchema,
    decenter: decenterConfigSchema,
    diffractiveElement: diffractiveElementSchema,
    clear_aperture: clearApertureSchema,
    edge_aperture: edgeApertureSchema,
  },
} as const;

/** Strict non-reflective object-plane schema. */
export const objectPrescriptionSchema = {
  type: "object",
  required: ["distance", "medium", "manufacturer"],
  additionalProperties: false,
  properties: {
    distance: finiteNumberSchema,
    medium: { type: "string", not: { enum: ["REFL", "refl"] } },
    manufacturer: { type: "string" },
  },
} as const;

/** Strict image-plane schema. */
export const imagePrescriptionSchema = {
  type: "object",
  required: ["curvatureRadius"],
  additionalProperties: false,
  properties: {
    curvatureRadius: finiteNumberSchema,
    decenter: decenterConfigSchema,
  },
} as const;

/** Complete external prescription schema, excluding specs and aperture mode. */
export const lensPrescriptionSchema = {
  type: "object",
  required: ["object", "surfaces", "image"],
  additionalProperties: false,
  properties: {
    object: objectPrescriptionSchema,
    surfaces: { type: "array", items: surfaceSchema },
    image: imagePrescriptionSchema,
  },
} as const;

/** Compiled validator shared by external prescription consumers. */
export const validateLensPrescription =
  createPrescriptionAjv().compile<Surfaces>(lensPrescriptionSchema);

/** Compiled validator for reusable imported and imperative OpticalSpecs values. */
export const validateOpticalSpecs =
  createPrescriptionAjv().compile<OpticalSpecs>(opticalSpecsSchema);
