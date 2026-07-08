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

export function formatMissingGlassMessage(missingGlasses: readonly string[]): string | undefined {
  if (missingGlasses.length === 0) {
    return undefined;
  }

  return `Unknown glass in prescription: ${missingGlasses.join(", ")}. Select a glass that exists in the loaded glass catalog or add it as a custom glass.`;
}
