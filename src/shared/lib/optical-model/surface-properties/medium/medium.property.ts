/**
 * Descriptors and RayOptics formatting for a gap's medium and its manufacturer.
 * Reversal reassigns gap media separately, so both values are preserved here.
 */
import {
  identity,
  type SurfacePropertyDescriptor,
} from "@/shared/lib/optical-model/surface-properties/descriptor";
import {
  builtInSpecialMaterial,
  nonBuiltInSpecialMaterial,
} from "@/shared/lib/optical-model/surface-properties/medium/specialMaterials";

/** Medium name, `"air"`, `"REFL"`, or a numeric model-glass index. Defaults to `"air"`. */
export const mediumProperty = {
  key: "medium",
  default: "air",
  scale: identity,
  reverse: identity,
} as const satisfies SurfacePropertyDescriptor<"medium">;

/** Catalog name, `"Custom"`, a model-glass Abbe number, or empty. Defaults to `""`. */
export const manufacturerProperty = {
  key: "manufacturer",
  default: "",
  scale: identity,
  reverse: identity,
} as const satisfies SurfacePropertyDescriptor<"manufacturer">;

/**
 * Formats a medium and manufacturer as RayOptics `add_surface`/`decode_medium`
 * arguments. Numeric media become model glass with an optional Abbe number,
 * `"Custom"` media index `user_defined_materials`, special materials use their
 * bare Python variables without a manufacturer, and catalog glass is quoted.
 */
export function formattedMedium(
  medium: string,
  glassManufacturer: string,
): { medium: string | number; glassManufacturer: string | number } {
  const refractiveIdxForModalGlass = parseFloat(medium);
  if (!Number.isNaN(refractiveIdxForModalGlass)) {
    // model glass
    const abbeNumber = parseFloat(glassManufacturer);

    return {
      medium: refractiveIdxForModalGlass,
      glassManufacturer: !Number.isNaN(abbeNumber) ? `, ${abbeNumber}` : "",
    };
  }

  if (glassManufacturer === "Custom") {
    return {
      medium: `user_defined_materials[${JSON.stringify(medium)}]`,
      glassManufacturer: "",
    };
  }

  // real medium or glass
  return {
    medium: nonBuiltInSpecialMaterial.get(medium) ?? JSON.stringify(medium),
    glassManufacturer:
      builtInSpecialMaterial.has(medium) ||
      nonBuiltInSpecialMaterial.has(medium)
        ? ""
        : `, ${JSON.stringify(glassManufacturer)}`,
  };
}
