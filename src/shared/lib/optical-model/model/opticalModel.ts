/**
 * Core sequential optical-model contracts, inferred from the TypeBox schemas so
 * the types and the import-boundary validators cannot drift. Across the model,
 * curvature radius zero means a flat surface and medium `REFL` denotes reflection.
 * This module only re-exports types, so importing it adds no runtime code.
 */
import type Type from "typebox";
import type {
  lensPrescriptionSchema,
  opticalModelSchema,
  surfaceSchema,
} from "@/shared/lib/optical-model/model/opticalModelSchema";

export type { SetAutoApertureFlag } from "@/shared/lib/optical-model/model/apertureFlag";
export type {
  FieldSpec,
  OpticalSpecs,
  PupilSpec,
} from "@/shared/lib/optical-model/specs/opticalSpecsSchema";
export type {
  AnnularAperture,
  ClearAperture,
  EdgeAperture,
  RectangularAperture,
  RonchiRulingAperture,
} from "@/shared/lib/optical-model/surface-properties/aperture/aperture.schema";
export type {
  AsphericalConfig,
  AsphericalPolynomialCoeffs,
  AsphericalType,
} from "@/shared/lib/optical-model/surface-properties/aspherical/aspherical.schema";
export type { DecenterConfig } from "@/shared/lib/optical-model/surface-properties/decenter/decenter.schema";
export type {
  DiffractionGrating,
  DiffractiveElement,
} from "@/shared/lib/optical-model/surface-properties/diffractive-element/diffractiveElement.schema";

/** A single optical surface in the sequential model, including an optional user-authored comment retained only by the web application. */
export type Surface = Type.Static<typeof surfaceSchema>;

/** Object plane, ordered physical surfaces, and image plane. */
export type Surfaces = Type.Static<typeof lensPrescriptionSchema>;

/** Complete sequential optical model validated at upload boundaries by `schema/validators.ts`. */
export type OpticalModel = Type.Static<typeof opticalModelSchema>;
