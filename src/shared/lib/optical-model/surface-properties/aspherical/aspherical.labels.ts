/** User-facing asphere type labels and select options derived from the asphere variant registry. */
import type { AsphericalType } from "@/shared/lib/optical-model/model/opticalModel";
import { ASPHERE_VARIANTS } from "@/shared/lib/optical-model/surface-properties/aspherical/aspherical.variants";

/** User-facing labels keyed by aspherical kind. */
export const ASPHERICAL_TYPE_LABELS = Object.fromEntries(
  Object.entries(ASPHERE_VARIANTS).map(([kind, variant]) => [
    kind,
    variant.label,
  ]),
) as Record<AsphericalType, string>;

/** Select options in variant-registry order. */
export const ASPHERICAL_TYPE_OPTIONS = (
  Object.keys(ASPHERE_VARIANTS) as AsphericalType[]
).map((value) => ({ value, label: ASPHERICAL_TYPE_LABELS[value] }));
