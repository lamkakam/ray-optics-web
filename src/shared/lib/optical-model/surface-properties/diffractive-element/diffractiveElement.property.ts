/**
 * Descriptor for the optional diffractive-element wrapper. Line-pair densities
 * and orders are dimension-free with respect to lens scaling, and reversal
 * preserves the element unchanged.
 */
import {
  identity,
  type SurfacePropertyDescriptor,
} from "@/shared/lib/optical-model/surface-properties/descriptor";

/** Optional diffractive element; a grating emits `phase_element = DiffractionGrating(...)` and enables wavelength ray-fan overlays. */
export const diffractiveElementProperty = {
  key: "diffractiveElement",
  scale: identity,
  reverse: identity,
  python: {
    surface: (surface, targetExpr) => {
      const grating = surface.diffractiveElement?.diffractionGrating;
      return grating === undefined
        ? []
        : [
            `${targetExpr}.phase_element = DiffractionGrating(grating_lpmm=${grating.lpmm}, order=${grating.order})`,
          ];
    },
  },
  needsWavelengthOverlay: (diffractiveElement) =>
    diffractiveElement.diffractionGrating !== undefined,
} as const satisfies SurfacePropertyDescriptor<"diffractiveElement">;
