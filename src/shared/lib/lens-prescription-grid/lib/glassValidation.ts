/**
 * Catalog-aware medium resolution shared by imports, WebMCP mutations, TXT
 * parsing, and pre-compute prescription validation.
 *
 * @remarks
 * Resolution precedence is built-in `air`/`REFL` and numeric model glass,
 * Special material, supplied manufacturer/glass pair, then Custom glass by
 * label. Lookup-backed values are returned verbatim so spelling and catalog
 * names use the canonical values created with the catalog snapshot.
 *
 * Whole-prescription resolution clones only the Object and physical surface
 * containers that need canonical media. Unknown issues use JSON Pointer paths:
 * `/object/medium` and zero-based `/surfaces/N/medium`. Named media cannot be
 * checked without lookup maps and therefore return `catalog-unavailable`.
 * Legacy pre-compute validation deliberately remains preload-tolerant when maps
 * are unavailable, while import and mutation callers consume the explicit
 * failure result.
 */
import type { GlassLookupMaps, GlassMediumLookupValue } from "@/features/glass-map/types/glassMap";
import type { OpticalModel, Surfaces } from "@/shared/lib/types/opticalModel";

interface PrescriptionMedium {
  readonly medium: string;
  readonly manufacturer: string;
}

/** Canonical medium/manufacturer pair resolved from one prescription row. */
export type ResolvedPrescriptionMedium = GlassMediumLookupValue;

/** Result of resolving one prescription medium. */
export type PrescriptionMediumResolution =
  | { readonly kind: "resolved"; readonly value: ResolvedPrescriptionMedium }
  | { readonly kind: "catalog-unavailable" }
  | { readonly kind: "unknown-medium"; readonly medium: string; readonly manufacturer: string };

/** One unknown prescription row with a JSON-pointer-compatible medium path. */
export interface UnknownPrescriptionMediumIssue extends PrescriptionMedium {
  readonly path: `/object/medium` | `/surfaces/${number}/medium`;
}

/** Result of canonicalizing all media in an optical model or surface contract. */
export type PrescriptionMediaResolution<T extends OpticalModel | Surfaces> =
  | { readonly kind: "resolved"; readonly model: T }
  | { readonly kind: "catalog-unavailable"; readonly path: UnknownPrescriptionMediumIssue["path"] }
  | { readonly kind: "unknown-medium"; readonly issues: readonly UnknownPrescriptionMediumIssue[] };

function normalizeLookupKey(value: string): string {
  return value.trim().toLowerCase();
}

function isFiniteNumericString(value: string): boolean {
  const trimmedValue = value.trim();
  return trimmedValue !== "" && Number.isFinite(Number(trimmedValue));
}

function resolveLookupIndependentMedium(
  { medium, manufacturer }: PrescriptionMedium,
): ResolvedPrescriptionMedium | undefined {
  const normalizedMedium = normalizeLookupKey(medium);
  if (normalizedMedium === "air") return { medium: "air", manufacturer: "" };
  if (normalizedMedium === "refl") return { medium: "REFL", manufacturer: "" };

  if (isFiniteNumericString(medium)) {
    const trimmedManufacturer = manufacturer.trim();
    if (trimmedManufacturer === "" || isFiniteNumericString(trimmedManufacturer)) {
      return { medium: medium.trim(), manufacturer: trimmedManufacturer };
    }
  }
  return undefined;
}

/** Resolves and canonicalizes one medium using the shared precedence rules. */
export function resolvePrescriptionMedium(
  input: PrescriptionMedium,
  lookupMaps: GlassLookupMaps | undefined,
): PrescriptionMediumResolution {
  const independent = resolveLookupIndependentMedium(input);
  if (independent !== undefined) return { kind: "resolved", value: independent };
  if (lookupMaps === undefined) return { kind: "catalog-unavailable" };

  const normalizedMedium = normalizeLookupKey(input.medium);
  const special = lookupMaps.mediumMap.get(normalizedMedium);
  if (special !== undefined) return { kind: "resolved", value: special };

  const normalizedManufacturer = normalizeLookupKey(input.manufacturer);
  const canonicalManufacturer = lookupMaps.manufacturerMap.get(normalizedManufacturer);
  const catalog = lookupMaps.mediumMap.get(
    `${normalizeLookupKey(canonicalManufacturer ?? normalizedManufacturer)}:${normalizedMedium}`,
  );
  if (catalog !== undefined) return { kind: "resolved", value: catalog };

  const custom = lookupMaps.customMediumMap.get(normalizedMedium)
    ?? lookupMaps.mediumMap.get(`custom:${normalizedMedium}`);
  if (custom !== undefined) return { kind: "resolved", value: custom };

  return {
    kind: "unknown-medium",
    medium: input.medium,
    manufacturer: input.manufacturer,
  };
}

/** Canonicalizes Object and surface media, or returns every unresolved row. */
export function resolvePrescriptionMedia<T extends OpticalModel | Surfaces>(
  prescription: T,
  lookupMaps: GlassLookupMaps | undefined,
): PrescriptionMediaResolution<T> {
  if (lookupMaps === undefined) return { kind: "catalog-unavailable", path: "/object/medium" };

  const entries: ReadonlyArray<{
    readonly path: UnknownPrescriptionMediumIssue["path"];
    readonly value: PrescriptionMedium;
  }> = [
    { path: "/object/medium", value: prescription.object },
    ...prescription.surfaces.map((surface, index) => ({
      path: `/surfaces/${index}/medium` as const,
      value: surface,
    })),
  ];
  const resolved: ResolvedPrescriptionMedium[] = [];
  const issues: UnknownPrescriptionMediumIssue[] = [];

  for (const entry of entries) {
    const result = resolvePrescriptionMedium(entry.value, lookupMaps);
    if (result.kind === "catalog-unavailable") {
      return { kind: "catalog-unavailable", path: entry.path };
    }
    if (result.kind === "unknown-medium") {
      issues.push({ path: entry.path, medium: result.medium, manufacturer: result.manufacturer });
    } else {
      resolved.push(result.value);
    }
  }

  if (issues.length > 0) return { kind: "unknown-medium", issues };

  const [objectMedium, ...surfaceMedia] = resolved;
  const model = {
    ...prescription,
    object: { ...prescription.object, ...objectMedium },
    surfaces: prescription.surfaces.map((surface, index) => ({ ...surface, ...surfaceMedia[index] })),
  } as T;
  return { kind: "resolved", model };
}

function displayMissingGlass({ medium, manufacturer }: PrescriptionMedium): string {
  const trimmedMedium = medium.trim();
  const trimmedManufacturer = manufacturer.trim();
  return trimmedManufacturer !== ""
    ? `${trimmedManufacturer}: ${trimmedMedium}`
    : `Custom: ${trimmedMedium}`;
}

/** Returns unique user-facing labels for structured unknown-medium issues. */
export function formatUnknownMediumIssues(
  issues: readonly UnknownPrescriptionMediumIssue[],
): string[] {
  return [...new Set(issues.map(displayMissingGlass))];
}

/** Returns deduplicated missing glass references in prescription order. */
export function getMissingPrescriptionGlasses(
  surfaces: OpticalModel | Surfaces,
  lookupMaps: GlassLookupMaps | undefined,
): string[] {
  const result = resolvePrescriptionMedia(surfaces, lookupMaps);
  if (result.kind !== "unknown-medium") return [];
  return formatUnknownMediumIssues(result.issues);
}

/** Formats missing glass references as a user-facing validation message. */
export function formatMissingGlassMessage(missingGlasses: readonly string[]): string | undefined {
  if (missingGlasses.length === 0) return undefined;
  return `Unknown glass in prescription: ${missingGlasses.join(", ")}. Select a glass that exists in the loaded glass catalog or add it as a custom glass.`;
}
