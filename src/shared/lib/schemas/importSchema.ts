/**
 * Strict import-boundary schemas compiled once with AJV. All object schemas reject
 * unknown keys, so format evolution requires an explicit schema-versioning decision.
 */
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import {
  createPrescriptionAjv,
  positiveFiniteNumberSchema,
  objectPrescriptionSchema,
  imagePrescriptionSchema,
  surfaceSchema,
  opticalSpecsSchema,
} from "@/shared/lib/schemas/prescriptionSchema";

const ajv = createPrescriptionAjv();

/**
 * Complete imported `OpticalModel` schema.
 * Object distance, medium, and manufacturer are required; reflective object media
 * are rejected, while `specs.field.isWideAngle` remains optional for legacy files.
 * Pupil keys accept only Object EPD, Object NA, and Image F/#. Field keys accept
 * only Object Height, Object Angle, and Image Height. The reusable specs schema
 * accepts both absolute and relative imported fields, one to ten field samples,
 * one to seven wavelength tuples, and an in-range integer reference index.
 */
const importedLensDataSchema = {
  type: "object",
  required: ["setAutoAperture", "specs", "object", "image", "surfaces"],
  additionalProperties: false,
  properties: {
    setAutoAperture: {
      type: "string",
      enum: ["autoAperture", "manualAperture"],
    },
    specs: {
      ...opticalSpecsSchema,
    },
    object: objectPrescriptionSchema,
    image: imagePrescriptionSchema,
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
const validateImportedLensData = ajv.compile<OpticalModel>(
  importedLensDataSchema,
);
/**
 * Validates strict version-1.0 custom-glass imports and exposes AJV errors on failure.
 */
const validateImportedCustomGlassData = ajv.compile(
  importedCustomGlassDataSchema,
);

export { validateImportedCustomGlassData, validateImportedLensData };
