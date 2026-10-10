/**
 * Strict import-boundary schemas compiled once with AJV. All object schemas reject
 * unknown keys, so format evolution requires an explicit schema-versioning decision.
 */
import type { OpticalModel } from "@/shared/lib/optical-model/model/opticalModel";
import {
  createPrescriptionAjv,
  objectPrescriptionSchema,
  imagePrescriptionSchema,
  surfaceSchema,
  opticalSpecsSchema,
} from "@/shared/lib/optical-model/schema/prescriptionSchema";

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

/**
 * Validates uploaded lens JSON before it reaches Zustand or the worker.
 * Structural failures populate the validator's `.errors` property.
 */
const validateImportedLensData = ajv.compile<OpticalModel>(
  importedLensDataSchema,
);

export { validateImportedLensData };
