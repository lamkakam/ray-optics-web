/**
 * Strict reusable schemas for the external lens-prescription contract. These are
 * shared by file import and WebMCP boundaries and compiled once per validator.
 */
import Ajv from "ajv";
import type { Surfaces } from "@/shared/lib/types/opticalModel";

/** Creates the project AJV instance with finite-number and cross-field support. */
export function createPrescriptionAjv(): Ajv {
  const ajv = new Ajv({ $data: true });
  ajv.addKeyword({
    keyword: "finiteNumber",
    type: "number",
    validate: (_schema: boolean, data: number) => Number.isFinite(data),
  });
  return ajv;
}

/** Numeric schema that rejects JavaScript non-finite values. */
export const finiteNumberSchema = { type: "number", finiteNumber: true } as const;
/** Finite-number schema constrained to values greater than zero. */
export const positiveFiniteNumberSchema = { ...finiteNumberSchema, exclusiveMinimum: 0 } as const;

/** Strict schema for all supported decenter strategies and offsets. */
export const decenterConfigSchema = {
  type: "object",
  required: ["coordinateSystemStrategy", "alpha", "beta", "gamma", "offsetX", "offsetY"],
  additionalProperties: false,
  properties: {
    coordinateSystemStrategy: { type: "string", enum: ["bend", "dec and return", "decenter", "reverse"] },
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
      type: "object", required: ["shape", "offsetX", "offsetY"], additionalProperties: false,
      properties: { shape: { type: "string", const: "circular" }, offsetX: finiteNumberSchema, offsetY: finiteNumberSchema },
    },
    {
      type: "object", required: ["shape", "obstructionRadius", "offsetX", "offsetY"], additionalProperties: false,
      properties: {
        shape: { type: "string", const: "annular" },
        obstructionRadius: { ...positiveFiniteNumberSchema, exclusiveMaximum: { $data: "2/semiDiameter" } },
        offsetX: finiteNumberSchema,
        offsetY: finiteNumberSchema,
      },
    },
    {
      type: "object", required: ["shape", "xHalfWidth", "yHalfWidth", "rotation", "offsetX", "offsetY"],
      additionalProperties: false, properties: rectangularProperties,
    },
    {
      type: "object", required: ["shape", "lpmm", "rotation", "offsetX", "offsetY"], additionalProperties: false,
      properties: {
        shape: { type: "string", const: "ronchi" }, lpmm: positiveFiniteNumberSchema, rotation: finiteNumberSchema,
        offsetX: finiteNumberSchema, offsetY: finiteNumberSchema,
      },
    },
  ],
} as const;

/** Supported circular and rectangular edge apertures. */
export const edgeApertureSchema = {
  oneOf: [
    {
      type: "object", required: ["shape", "radius", "offsetX", "offsetY"], additionalProperties: false,
      properties: {
        shape: { type: "string", const: "circular" }, radius: positiveFiniteNumberSchema,
        offsetX: finiteNumberSchema, offsetY: finiteNumberSchema,
      },
    },
    {
      type: "object", required: ["shape", "xHalfWidth", "yHalfWidth", "rotation", "offsetX", "offsetY"],
      additionalProperties: false, properties: rectangularProperties,
    },
  ],
} as const;

const polynomialCoefficientsSchema = { type: "array", items: finiteNumberSchema, maxItems: 10 } as const;
/** Supported discriminated conic, polynomial, and toroidal aspheres. */
export const asphericalSchema = {
  oneOf: [
    {
      type: "object", required: ["kind", "conicConstant"], additionalProperties: false,
      properties: { kind: { type: "string", const: "Conic" }, conicConstant: finiteNumberSchema },
    },
    ...(["EvenAspherical", "RadialPolynomial"] as const).map((kind) => ({
      type: "object", required: ["kind", "conicConstant", "polynomialCoefficients"], additionalProperties: false,
      properties: { kind: { type: "string", const: kind }, conicConstant: finiteNumberSchema, polynomialCoefficients: polynomialCoefficientsSchema },
    })),
    ...(["XToroid", "YToroid"] as const).map((kind) => ({
      type: "object", required: ["kind", "conicConstant", "toricSweepRadiusOfCurvature", "polynomialCoefficients"], additionalProperties: false,
      properties: {
        kind: { type: "string", const: kind }, conicConstant: finiteNumberSchema,
        toricSweepRadiusOfCurvature: finiteNumberSchema, polynomialCoefficients: polynomialCoefficientsSchema,
      },
    })),
  ],
} as const;

/** Strict physical-surface schema including all nested grid fields. */
export const surfaceSchema = {
  type: "object",
  required: ["label", "curvatureRadius", "thickness", "medium", "manufacturer", "semiDiameter"],
  additionalProperties: false,
  allOf: [{
    if: {
      required: ["clear_aperture"],
      properties: { clear_aperture: { type: "object", required: ["shape"], properties: { shape: { const: "ronchi" } } } },
    },
    then: { properties: { semiDiameter: positiveFiniteNumberSchema } },
  }],
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
  type: "object", required: ["distance", "medium", "manufacturer"], additionalProperties: false,
  properties: {
    distance: finiteNumberSchema,
    medium: { type: "string", not: { enum: ["REFL", "refl"] } },
    manufacturer: { type: "string" },
  },
} as const;

/** Strict image-plane schema. */
export const imagePrescriptionSchema = {
  type: "object", required: ["curvatureRadius"], additionalProperties: false,
  properties: { curvatureRadius: finiteNumberSchema, decenter: decenterConfigSchema },
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
export const validateLensPrescription = createPrescriptionAjv().compile<Surfaces>(lensPrescriptionSchema);
