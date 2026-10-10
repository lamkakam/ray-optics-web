/**
 * Pure registry of every surface property. Adding a `Surface` schema key without
 * a descriptor here is a compile error. Key order is significant: it is the order
 * of RayOptics follow-up statements emitted after `sm.add_surface(...)` (the stop
 * label must stay last) and of numeric values collected for scaling validation.
 */
import {
  imagePrescriptionSchema,
  surfaceSchema,
} from "@/shared/lib/optical-model/model/opticalModelSchema";
import {
  clearApertureProperty,
  edgeApertureProperty,
} from "@/shared/lib/optical-model/surface-properties/aperture/aperture.property";
import { asphericalProperty } from "@/shared/lib/optical-model/surface-properties/aspherical/aspherical.property";
import {
  commentProperty,
  curvatureRadiusProperty,
  labelProperty,
  semiDiameterProperty,
  thicknessProperty,
} from "@/shared/lib/optical-model/surface-properties/core/core.property";
import { decenterProperty } from "@/shared/lib/optical-model/surface-properties/decenter/decenter.property";
import type {
  ImagePropertyKey,
  SurfacePropertyKey,
  SurfacePropertyRegistry,
} from "@/shared/lib/optical-model/surface-properties/descriptor";
import { diffractiveElementProperty } from "@/shared/lib/optical-model/surface-properties/diffractive-element/diffractiveElement.property";
import {
  manufacturerProperty,
  mediumProperty,
} from "@/shared/lib/optical-model/surface-properties/medium/medium.property";

/** Every surface property descriptor, keyed by `Surface` key in emission order. */
export const SURFACE_PROPERTIES: SurfacePropertyRegistry = {
  curvatureRadius: curvatureRadiusProperty,
  thickness: thicknessProperty,
  medium: mediumProperty,
  manufacturer: manufacturerProperty,
  semiDiameter: semiDiameterProperty,
  clear_aperture: clearApertureProperty,
  edge_aperture: edgeApertureProperty,
  aspherical: asphericalProperty,
  decenter: decenterProperty,
  diffractiveElement: diffractiveElementProperty,
  comment: commentProperty,
  label: labelProperty,
};

/** Surface property keys in registry (emission) order. */
export const SURFACE_PROPERTY_KEYS = Object.keys(
  SURFACE_PROPERTIES,
) as SurfacePropertyKey[];

const requiredSurfaceKeys = new Set<string>(surfaceSchema.required);

/** Surface property keys that may be omitted, in registry order. */
export const OPTIONAL_SURFACE_PROPERTY_KEYS = SURFACE_PROPERTY_KEYS.filter(
  (key) => !requiredSurfaceKeys.has(key),
);

const imageSchemaKeys = new Set<string>(
  Object.keys(imagePrescriptionSchema.properties),
);

/** Image-plane property keys, in registry order. */
export const IMAGE_PROPERTY_KEYS = SURFACE_PROPERTY_KEYS.filter((key) =>
  imageSchemaKeys.has(key),
) as ImagePropertyKey[];
