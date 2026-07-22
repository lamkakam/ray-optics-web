/**
 * Strict import-boundary schemas compiled once with AJV. All object schemas reject
 * unknown keys, so format evolution requires an explicit schema-versioning decision.
 */
import Ajv from "ajv";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";

/** Shared AJV compiler with `$data` enabled for cross-field aperture validation. */
const ajv = new Ajv({ $data: true });
ajv.addKeyword({
  keyword: "finiteNumber",
  type: "number",
  validate: (_schema: boolean, data: number) => Number.isFinite(data),
});

/** Numeric schema that rejects JavaScript non-finite values. */
const finiteNumberSchema = {
  type: "number",
  finiteNumber: true,
} as const;

/** Finite-number schema constrained to values greater than zero. */
const positiveFiniteNumberSchema = {
  ...finiteNumberSchema,
  exclusiveMinimum: 0,
} as const;

/** Strict schema for all supported decenter coordinate-system strategies and offsets. */
const decenterConfigSchema = {
  type: "object",
  required: ["coordinateSystemStrategy", "alpha", "beta", "gamma", "offsetX", "offsetY"],
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
};

/** Strict surface diffraction-grating schema. */
const diffractionGratingSchema = {
  type: "object",
  required: ["lpmm", "order"],
  additionalProperties: false,
  properties: {
    lpmm: finiteNumberSchema,
    order: { type: "integer" },
  },
};

/** Circular clear aperture with required finite offsets. */
const circularClearApertureSchema = {
  type: "object",
  required: ["shape", "offsetX", "offsetY"],
  additionalProperties: false,
  properties: {
    shape: { type: "string", const: "circular" },
    offsetX: finiteNumberSchema,
    offsetY: finiteNumberSchema,
  },
};

/** Annular clear aperture whose obstruction is positive and smaller than `semiDiameter`. */
const annularClearApertureSchema = {
  type: "object",
  required: ["shape", "obstructionRadius", "offsetX", "offsetY"],
  additionalProperties: false,
  properties: {
    shape: { type: "string", const: "annular" },
    obstructionRadius: { ...positiveFiniteNumberSchema, exclusiveMaximum: { $data: "2/semiDiameter" } },
    offsetX: finiteNumberSchema,
    offsetY: finiteNumberSchema,
  },
};

/** Shared positive dimensions and finite transform properties for rectangular apertures. */
const rectangularApertureProperties = {
  shape: { type: "string", const: "rectangular" },
  xHalfWidth: positiveFiniteNumberSchema,
  yHalfWidth: positiveFiniteNumberSchema,
  rotation: finiteNumberSchema,
  offsetX: finiteNumberSchema,
  offsetY: finiteNumberSchema,
};

/** Strict rectangular clear-aperture schema. */
const rectangularClearApertureSchema = {
  type: "object",
  required: ["shape", "xHalfWidth", "yHalfWidth", "rotation", "offsetX", "offsetY"],
  additionalProperties: false,
  properties: rectangularApertureProperties,
};

/** Strict rectangular edge-aperture schema. */
const rectangularEdgeApertureSchema = {
  type: "object",
  required: ["shape", "xHalfWidth", "yHalfWidth", "rotation", "offsetX", "offsetY"],
  additionalProperties: false,
  properties: rectangularApertureProperties,
};

/** Circular edge aperture with a positive radius and finite offsets. */
const circularEdgeApertureSchema = {
  type: "object",
  required: ["shape", "radius", "offsetX", "offsetY"],
  additionalProperties: false,
  properties: {
    shape: { type: "string", const: "circular" },
    radius: positiveFiniteNumberSchema,
    offsetX: finiteNumberSchema,
    offsetY: finiteNumberSchema,
  },
};

/** Supported circular, annular, and rectangular clear-aperture union. */
const clearApertureSchema = {
  oneOf: [circularClearApertureSchema, annularClearApertureSchema, rectangularClearApertureSchema],
};

/** Supported circular and rectangular edge-aperture union. */
const edgeApertureSchema = {
  oneOf: [circularEdgeApertureSchema, rectangularEdgeApertureSchema],
};

/** Conic asphere discriminator and finite conic constant. */
const conicAsphericalSchema = {
  type: "object",
  required: ["kind", "conicConstant"],
  additionalProperties: false,
  properties: {
    kind: { type: "string", const: "Conic" },
    conicConstant: finiteNumberSchema,
  },
};

/** Even-asphere schema with at most ten finite polynomial coefficients. */
const evenAsphericalSchema = {
  type: "object",
  required: ["kind", "conicConstant", "polynomialCoefficients"],
  additionalProperties: false,
  properties: {
    kind: { type: "string", const: "EvenAspherical" },
    conicConstant: finiteNumberSchema,
    polynomialCoefficients: {
      type: "array",
      items: finiteNumberSchema,
      maxItems: 10,
    },
  },
};

/** Radial-polynomial schema with at most ten finite coefficients. */
const radialPolynomialSchema = {
  type: "object",
  required: ["kind", "conicConstant", "polynomialCoefficients"],
  additionalProperties: false,
  properties: {
    kind: { type: "string", const: "RadialPolynomial" },
    conicConstant: finiteNumberSchema,
    polynomialCoefficients: {
      type: "array",
      items: finiteNumberSchema,
      maxItems: 10,
    },
  },
};

/** X-toroid schema requiring a finite sweep radius and at most ten coefficients. */
const xToroidSchema = {
  type: "object",
  required: ["kind", "conicConstant", "toricSweepRadiusOfCurvature", "polynomialCoefficients"],
  additionalProperties: false,
  properties: {
    kind: { type: "string", const: "XToroid" },
    conicConstant: finiteNumberSchema,
    toricSweepRadiusOfCurvature: finiteNumberSchema,
    polynomialCoefficients: {
      type: "array",
      items: finiteNumberSchema,
      maxItems: 10,
    },
  },
};

/** Y-toroid schema requiring a finite sweep radius and at most ten coefficients. */
const yToroidSchema = {
  type: "object",
  required: ["kind", "conicConstant", "toricSweepRadiusOfCurvature", "polynomialCoefficients"],
  additionalProperties: false,
  properties: {
    kind: { type: "string", const: "YToroid" },
    conicConstant: finiteNumberSchema,
    toricSweepRadiusOfCurvature: finiteNumberSchema,
    polynomialCoefficients: {
      type: "array",
      items: finiteNumberSchema,
      maxItems: 10,
    },
  },
};

/** Strict physical-surface schema, including optional asphere, decenter, grating, and apertures. */
const surfaceSchema = {
  type: "object",
  required: ["label", "curvatureRadius", "thickness", "medium", "manufacturer", "semiDiameter"],
  additionalProperties: false,
  properties: {
    label: { type: "string", enum: ["Default", "Stop"] },
    curvatureRadius: finiteNumberSchema,
    thickness: finiteNumberSchema,
    medium: { type: "string" },
    manufacturer: { type: "string" },
    semiDiameter: finiteNumberSchema,
    aspherical: {
      oneOf: [conicAsphericalSchema, evenAsphericalSchema, radialPolynomialSchema, xToroidSchema, yToroidSchema],
    },
    decenter: decenterConfigSchema,
    diffractionGrating: diffractionGratingSchema,
    clear_aperture: clearApertureSchema,
    edge_aperture: edgeApertureSchema,
  },
};

/**
 * Complete imported `OpticalModel` schema.
 * Object distance, medium, and manufacturer are required; reflective object media
 * are rejected, while `specs.field.isWideAngle` remains optional for legacy files.
 */
const importedLensDataSchema = {
  type: "object",
  required: ["setAutoAperture", "specs", "object", "image", "surfaces"],
  additionalProperties: false,
  properties: {
    setAutoAperture: { type: "string", enum: ["autoAperture", "manualAperture"] },
    specs: {
      type: "object",
      required: ["pupil", "field", "wavelengths"],
      additionalProperties: false,
      properties: {
        pupil: {
          type: "object",
          required: ["space", "type", "value"],
          additionalProperties: false,
          properties: {
            space: { type: "string", enum: ["object", "image"] },
            type: { type: "string", enum: ["epd", "f/#", "NA"] },
            value: finiteNumberSchema,
          },
        },
        field: {
          type: "object",
          required: ["space", "type", "maxField", "fields", "isRelative"],
          additionalProperties: false,
          properties: {
            space: { type: "string", enum: ["object", "image"] },
            type: { type: "string", enum: ["angle", "height"] },
            maxField: finiteNumberSchema,
            fields: { type: "array", items: finiteNumberSchema },
            isRelative: { type: "boolean" },
            isWideAngle: { type: "boolean" },
          },
        },
        wavelengths: {
          type: "object",
          required: ["weights", "referenceIndex"],
          additionalProperties: false,
          properties: {
            weights: {
              type: "array",
              items: {
                type: "array",
                items: finiteNumberSchema,
                minItems: 2,
                maxItems: 2,
              },
            },
            referenceIndex: finiteNumberSchema,
          },
        },
      },
    },
    object: {
      type: "object",
      required: ["distance", "medium", "manufacturer"],
      additionalProperties: false,
      properties: {
        distance: finiteNumberSchema,
        medium: { type: "string", not: { enum: ["REFL", "refl"] } },
        manufacturer: { type: "string" },
      },
    },
    image: {
      type: "object",
      required: ["curvatureRadius"],
      additionalProperties: false,
      properties: {
        curvatureRadius: finiteNumberSchema,
        decenter: decenterConfigSchema,
      },
    },
    surfaces: {
      type: "array",
      items: surfaceSchema,
    },
  },
};

/** Tabulated custom glass with at least four positive wavelength/index pairs. */
const customGlassMaterialSchema = {
  type: "object",
  required: ["type", "data"],
  additionalProperties: false,
  properties: {
    type: { type: "string", const: "tabulated" },
    data: {
      type: "array",
      minItems: 4,
      items: {
        type: "array",
        minItems: 2,
        maxItems: 2,
        items: positiveFiniteNumberSchema,
      },
    },
  },
};

/** Strict version-1.0 custom-glass import envelope. */
const importedCustomGlassDataSchema = {
  type: "object",
  required: ["version", "Custom"],
  additionalProperties: false,
  properties: {
    version: { type: "string", pattern: "^\\d+\\.\\d+$", const: "1.0" },
    Custom: {
      type: "object",
      additionalProperties: customGlassMaterialSchema,
    },
  },
};

/**
 * Validates uploaded lens JSON before it reaches Zustand or the worker.
 * Structural failures populate the validator's `.errors` property.
 */
const validateImportedLensData = ajv.compile<OpticalModel>(importedLensDataSchema);
/**
 * Validates strict version-1.0 custom-glass imports and exposes AJV errors on failure.
 */
const validateImportedCustomGlassData = ajv.compile(importedCustomGlassDataSchema);

export { validateImportedCustomGlassData, validateImportedLensData };
