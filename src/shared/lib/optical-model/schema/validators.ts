/**
 * Strict import-boundary validators compiled once with AJV from the TypeBox
 * optical-model schemas. Structural failures populate each validator's `.errors`.
 */
import { createPrescriptionAjv } from "@/shared/lib/optical-model/schema/ajv";
import type {
  OpticalModel,
  OpticalSpecs,
  Surfaces,
} from "@/shared/lib/optical-model/model/opticalModel";
import {
  lensPrescriptionSchema,
  opticalModelSchema,
} from "@/shared/lib/optical-model/model/opticalModelSchema";
import { opticalSpecsSchema } from "@/shared/lib/optical-model/specs/opticalSpecsSchema";

/** Validates uploaded lens JSON before it reaches Zustand or the worker. */
export const validateImportedLensData =
  createPrescriptionAjv().compile<OpticalModel>(opticalModelSchema);

/** Validates an external prescription: object plane, surfaces, and image plane, without specs or aperture mode. */
export const validateLensPrescription =
  createPrescriptionAjv().compile<Surfaces>(lensPrescriptionSchema);

/** Validates reusable imported and imperative OpticalSpecs values. */
export const validateOpticalSpecs =
  createPrescriptionAjv().compile<OpticalSpecs>(opticalSpecsSchema);
