/**
 * React-side registry of modal-backed surface properties. Its key order is the
 * order in which their grid columns appear (Medium is placed before the
 * semi-diameter column; the rest follow it). Pure code such as the Pyodide
 * worker must import `registry.ts` instead, never this module.
 */
import { apertureUi } from "@/shared/lib/optical-model/surface-properties/aperture/aperture.ui";
import { asphericalUi } from "@/shared/lib/optical-model/surface-properties/aspherical/aspherical.ui";
import { decenterUi } from "@/shared/lib/optical-model/surface-properties/decenter/decenter.ui";
import { diffractiveElementUi } from "@/shared/lib/optical-model/surface-properties/diffractive-element/diffractiveElement.ui";
import { mediumUi } from "@/shared/lib/optical-model/surface-properties/medium/medium.ui";
import type { SurfacePropertyUi } from "@/shared/lib/optical-model/surface-properties/uiDescriptor";

/** Modal-backed surface property UIs in grid-column order. */
export const SURFACE_PROPERTY_UIS = {
  medium: mediumUi,
  aperture: apertureUi,
  aspherical: asphericalUi,
  decenter: decenterUi,
  diffractiveElement: diffractiveElementUi,
} as const satisfies Record<string, SurfacePropertyUi>;

/** Identifier of a modal-backed surface property. */
export type SurfacePropertyUiKey = keyof typeof SURFACE_PROPERTY_UIS;

/** Modal-backed surface property keys in grid-column order. */
export const SURFACE_PROPERTY_UI_KEYS = Object.keys(
  SURFACE_PROPERTY_UIS,
) as SurfacePropertyUiKey[];
