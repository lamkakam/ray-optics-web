/**
 * Shared client-side validation for prescription media before worker-backed lens update or optimization operations use an `OpticalModel`.
 *
 * @remarks
 * ## Behavior
 *
 * - Validates the object medium and each sequential surface medium. The image row is not validated because it has no medium.
 * - Allows validation to pass when `lookupMaps` is `undefined`, avoiding false blocking during catalog preload and isolated test states.
 * - Allows `air` and `REFL` without lookup entries.
 * - Allows model-glass rows without lookup entries when `medium` is a finite numeric refractive index and `manufacturer` is blank.
 * - Allows model-glass rows without lookup entries when `medium` is a finite numeric refractive index and `manufacturer` is a finite numeric Abbe number.
 * - For rows with a manufacturer, checks `mediumMap` using the normalized `manufacturer:medium` key.
 * - For rows without a manufacturer, first checks the plain normalized medium key for special media, then checks `custom:medium` for user-defined glasses.
 * - Numeric `medium` values with nonnumeric `manufacturer` text are treated as catalog glass rows and must exist in the lookup maps.
 * - Missing labels are deduplicated in prescription order.
 * - Missing rows with a manufacturer display as `<Manufacturer>: <Glass>`.
 * - Missing rows without a manufacturer display as `Custom: <Glass>`.
 *
 * ## Message
 *
 * The default formatted message is:
 *
 * `Unknown glass in prescription: <missing glasses>. Select a glass that exists in the loaded glass catalog or add it as a custom glass.`
 */
import type { GlassLookupMaps } from "@/features/glass-map/types/glassMap";
import type { OpticalModel, Surfaces } from "@/shared/lib/types/opticalModel";

const BUILT_IN_MEDIA_WITHOUT_LOOKUP = new Set(["air", "refl"]);

interface PrescriptionMedium {
  readonly medium: string;
  readonly manufacturer: string;
}

function normalizeLookupKey(value: string): string {
  return value.trim().toLowerCase();
}

function displayMissingGlass({ medium, manufacturer }: PrescriptionMedium): string {
  const trimmedMedium = medium.trim();
  const trimmedManufacturer = manufacturer.trim();
  if (trimmedManufacturer !== "") {
    return `${trimmedManufacturer}: ${trimmedMedium}`;
  }
  return `Custom: ${trimmedMedium}`;
}

function getPrescriptionMedia(surfaces: Surfaces): PrescriptionMedium[] {
  return [
    surfaces.object,
    ...surfaces.surfaces,
  ].map(({ medium, manufacturer }) => ({ medium, manufacturer }));
}

function isFiniteNumericString(value: string): boolean {
  const trimmedValue = value.trim();
  return trimmedValue !== "" && Number.isFinite(Number(trimmedValue));
}

function isModelGlass({ medium, manufacturer }: PrescriptionMedium): boolean {
  if (!isFiniteNumericString(medium)) {
    return false;
  }

  const trimmedManufacturer = manufacturer.trim();
  return trimmedManufacturer === "" || isFiniteNumericString(trimmedManufacturer);
}

function hasKnownMedium(
  { medium, manufacturer }: PrescriptionMedium,
  lookupMaps: GlassLookupMaps,
): boolean {
  if (isModelGlass({ medium, manufacturer })) {
    return true;
  }

  const normalizedMedium = normalizeLookupKey(medium);
  if (BUILT_IN_MEDIA_WITHOUT_LOOKUP.has(normalizedMedium)) {
    return true;
  }

  const normalizedManufacturer = normalizeLookupKey(manufacturer);
  if (normalizedManufacturer !== "") {
    return lookupMaps.mediumMap.has(`${normalizedManufacturer}:${normalizedMedium}`);
  }

  return lookupMaps.mediumMap.has(normalizedMedium)
    || lookupMaps.mediumMap.has(`custom:${normalizedMedium}`);
}

/** Returns canonical missing glass references from an optical model. */
export function getMissingPrescriptionGlasses(
  surfaces: OpticalModel | Surfaces,
  lookupMaps: GlassLookupMaps | undefined,
): string[] {
  if (lookupMaps === undefined) {
    return [];
  }

  const missing = new Set<string>();
  for (const medium of getPrescriptionMedia(surfaces)) {
    if (!hasKnownMedium(medium, lookupMaps)) {
      missing.add(displayMissingGlass(medium));
    }
  }
  return [...missing];
}

/** Formats missing glass references as a user-facing validation message. */
export function formatMissingGlassMessage(missingGlasses: readonly string[]): string | undefined {
  if (missingGlasses.length === 0) {
    return undefined;
  }

  return `Unknown glass in prescription: ${missingGlasses.join(", ")}. Select a glass that exists in the loaded glass catalog or add it as a custom glass.`;
}
