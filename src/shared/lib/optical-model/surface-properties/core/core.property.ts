/**
 * Descriptors for the always-present scalar surface properties. Curvature
 * radius, thickness, medium, and manufacturer are emitted together in the
 * `sm.add_surface(...)` call, so only the image radius and the stop label emit
 * follow-up statements here.
 */
import {
  identity,
  negateNumber,
  scaleLinear,
  type SurfacePropertyDescriptor,
} from "@/shared/lib/optical-model/surface-properties/descriptor";

/** `"Stop"` marks the aperture stop and emits `sm.set_stop()`; defaults to `"Default"`. */
export const labelProperty = {
  key: "label",
  default: "Default",
  scale: identity,
  reverse: identity,
  python: {
    surface: (surface) => (surface.label === "Stop" ? ["sm.set_stop()"] : []),
  },
} as const satisfies SurfacePropertyDescriptor<"label">;

/** Optional web-only annotation; never emitted to RayOptics. */
export const commentProperty = {
  key: "comment",
  scale: identity,
  reverse: identity,
} as const satisfies SurfacePropertyDescriptor<"comment">;

/** Signed radius (zero means flat); scales linearly and changes sign on reversal. Defaults to `0`. */
export const curvatureRadiusProperty = {
  key: "curvatureRadius",
  default: 0,
  scale: scaleLinear,
  reverse: negateNumber,
  python: {
    image: (curvatureRadius, targetExpr) => [
      `${targetExpr}.profile.r = ${curvatureRadius}`,
    ],
  },
} as const satisfies SurfacePropertyDescriptor<"curvatureRadius">;

/** Gap after the surface. Reversal reassigns gaps separately, so the value itself is preserved. Defaults to `0`. */
export const thicknessProperty = {
  key: "thickness",
  default: 0,
  scale: scaleLinear,
  reverse: identity,
} as const satisfies SurfacePropertyDescriptor<"thickness">;

/** Circular clear-aperture radius; emitted through the clear-aperture descriptor. Defaults to `1`. */
export const semiDiameterProperty = {
  key: "semiDiameter",
  default: 1,
  scale: scaleLinear,
  reverse: identity,
} as const satisfies SurfacePropertyDescriptor<"semiDiameter">;
