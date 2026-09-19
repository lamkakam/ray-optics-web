/**
 * Canonical frontend validation for tabulated custom glass. The exported strict
 * schemas and compiled validators are shared by JSON, CSV, modal, persistence,
 * worker-bound, and WebMCP boundaries.
 */
import type Ajv from "ajv";
import type { ValidateFunction } from "ajv";
import type { UserDefinedGlassInput } from "@/features/glass-map/types/glassMap";
import {
  createPrescriptionAjv,
  positiveFiniteNumberSchema,
} from "@/shared/lib/schemas/prescriptionSchema";

/** Minimum wavelength/index samples accepted by every frontend boundary. */
export const MIN_CUSTOM_GLASS_PAIRS = 4;

/** Strict positive finite `[wavelengthNanometres, refractiveIndex]` tuple. */
export const customGlassPairSchema = {
  type: "array",
  minItems: 2,
  maxItems: 2,
  items: positiveFiniteNumberSchema,
} as const;

/** Strict collection of sufficiently many pairs with unique wavelengths. */
export const customGlassPairsSchema = {
  type: "array",
  minItems: MIN_CUSTOM_GLASS_PAIRS,
  uniqueCustomGlassWavelengths: true,
  items: customGlassPairSchema,
} as const;

/** Strict named worker input for one custom glass. */
export const customGlassInputSchema = {
  type: "object",
  required: ["name", "pairs"],
  additionalProperties: false,
  properties: {
    name: { type: "string", pattern: ".*\\S.*" },
    pairs: customGlassPairsSchema,
  },
} as const;

/** Strict JSON-import material value. */
export const customGlassMaterialSchema = {
  type: "object",
  required: ["type", "data"],
  additionalProperties: false,
  properties: {
    type: { type: "string", const: "tabulated" },
    data: customGlassPairsSchema,
  },
} as const;

/** Strict IndexedDB row shape. */
export const persistedCustomGlassRowSchema = {
  type: "object",
  required: ["label", "type", "pairs"],
  additionalProperties: false,
  properties: {
    label: { type: "string", pattern: ".*\\S.*" },
    type: { type: "string", const: "tabulated" },
    pairs: customGlassPairsSchema,
  },
} as const;

/** Returns the numeric wavelengths that occur more than once. */
export function duplicateCustomGlassWavelengths(
  pairs: readonly (readonly [number, number])[],
): Set<number> {
  const counts = new Map<number, number>();
  for (const [wavelength] of pairs) {
    counts.set(wavelength, (counts.get(wavelength) ?? 0) + 1);
  }
  return new Set(
    [...counts]
      .filter(([, count]) => count > 1)
      .map(([wavelength]) => wavelength),
  );
}

/** Creates the project AJV instance with custom-glass uniqueness support. */
export function createCustomGlassAjv(): Ajv {
  const instance = createPrescriptionAjv();
  instance.addKeyword({
    keyword: "uniqueCustomGlassWavelengths",
    type: "array",
    schemaType: "boolean",
    validate: (
      enabled: boolean,
      data: readonly (readonly [number, number])[],
    ) => !enabled || duplicateCustomGlassWavelengths(data).size === 0,
  });
  return instance;
}

const ajv = createCustomGlassAjv();

/** Compiled validator for a pair collection. */
export const validateCustomGlassPairs: ValidateFunction<
  readonly (readonly [number, number])[]
> = ajv.compile(customGlassPairsSchema);

/** Compiled validator for one named worker input. */
export const validateCustomGlassInput: ValidateFunction<UserDefinedGlassInput> =
  ajv.compile(customGlassInputSchema);

/** Compiled validator for one strict persisted row. */
export const validatePersistedCustomGlassRow = ajv.compile(
  persistedCustomGlassRowSchema,
);
