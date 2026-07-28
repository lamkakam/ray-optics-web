/**
 * Pure glass-candidate catalog and selection helpers.
 *
 * @remarks
 * Candidate identity is always the explicit `(catalog, name)` pair sent to the
 * worker. All seven live optical coordinates remain UI-only data, so grid
 * sorting and filtering can update the presentation without changing worker payloads.
 * Special candidates are deliberately restricted to the four bundled optical
 * materials; `air`, `REFL`, and any unexpected Special bucket entries are never
 * eligible. Persisted identities missing from the current catalog snapshot are
 * retained as unavailable rows so users can remove stale Custom selections.
 */
import { CATALOG_NAMES, type AllGlassCatalogsData, type CatalogName } from "@/features/glass-map/types/glassMap";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import type { GlassCandidateConfig, GlassCatalogName } from "@/features/optimization/types/optimizationWorkerTypes";

/** The only bundled Special materials eligible for categorical substitution. */
export const ELIGIBLE_SPECIAL_GLASS_NAMES = [
  "CaF2",
  "Fused Silica",
  "Water",
  "D263TECO",
] as const;

const ELIGIBLE_SPECIAL_GLASS_NAME_SET = new Set<string>(ELIGIBLE_SPECIAL_GLASS_NAMES);
const CATALOG_ORDER = new Map<string, number>(CATALOG_NAMES.map((catalog, index) => [catalog, index]));

function compareGlassCandidates(
  left: GlassCandidateConfig,
  right: GlassCandidateConfig,
): number {
  const catalogDifference =
    (CATALOG_ORDER.get(left.catalog) ?? Number.MAX_SAFE_INTEGER)
    - (CATALOG_ORDER.get(right.catalog) ?? Number.MAX_SAFE_INTEGER);
  return catalogDifference !== 0
    ? catalogDifference
    : left.name.localeCompare(right.name);
}

/** One live or stale candidate row rendered in the glass-variable grid. */
export interface GlassCandidateRow extends GlassCandidateConfig {
  readonly id: string;
  /** Accessible row-selection label used by the AG Grid test and browser UI. */
  readonly label: string;
  /** Refractive index at the Fraunhofer d line. */
  readonly nd?: number;
  /** Abbe number centered on the Fraunhofer d line. */
  readonly vd?: number;
  /** Refractive index at the Fraunhofer e line. */
  readonly ne?: number;
  /** Abbe number centered on the Fraunhofer e line. */
  readonly ve?: number;
  /** Relative partial dispersion Pg,F. */
  readonly pgF?: number;
  /** Relative partial dispersion PF,e. */
  readonly pFe?: number;
  /** Relative partial dispersion PF,d. */
  readonly pFd?: number;
  readonly available: boolean;
}

/** Creates an unambiguous internal key without changing the persisted payload. */
export function getGlassCandidateIdentity(candidate: GlassCandidateConfig): string {
  return `${candidate.catalog}\u0000${candidate.name}`;
}

/** Sorts identities by canonical catalog order and then glass name. */
export function sortGlassCandidates(
  candidates: ReadonlyArray<GlassCandidateConfig>,
): GlassCandidateConfig[] {
  return [...candidates].sort(compareGlassCandidates);
}

function isEligibleCatalogGlass(catalog: CatalogName, name: string): boolean {
  return catalog !== "Special" || ELIGIBLE_SPECIAL_GLASS_NAME_SET.has(name);
}

/** Builds sorted live rows with seven optical coordinates from all eight catalog buckets. */
export function buildLiveGlassCandidateRows(
  catalogs: AllGlassCatalogsData | undefined,
): GlassCandidateRow[] {
  return CATALOG_NAMES.flatMap((catalog) =>
    Object.entries(catalogs?.[catalog] ?? {})
      .filter(([name]) => isEligibleCatalogGlass(catalog, name))
      .map(([name, data]) => {
        const candidate = { catalog: catalog as GlassCatalogName, name };
        return {
          ...candidate,
          id: getGlassCandidateIdentity(candidate),
          label: `${catalog} ${name}`,
          nd: data.refractiveIndexD,
          vd: data.abbeNumberD,
          ne: data.refractiveIndexE,
          ve: data.abbeNumberE,
          pgF: data.partialDispersions.P_gF,
          pFe: data.partialDispersions.P_fe,
          pFd: data.partialDispersions.P_Fd,
          available: true,
        };
      }),
  ).sort(compareGlassCandidates);
}

/** Adds missing persisted identities as unavailable rows without duplicating live rows. */
export function mergePersistedGlassCandidateRows(
  liveRows: ReadonlyArray<GlassCandidateRow>,
  persistedCandidates: ReadonlyArray<GlassCandidateConfig>,
): GlassCandidateRow[] {
  const rowsByIdentity = new Map(liveRows.map((row) => [row.id, row] as const));
  for (const candidate of persistedCandidates) {
    const id = getGlassCandidateIdentity(candidate);
    if (!rowsByIdentity.has(id)) {
      rowsByIdentity.set(id, {
        ...candidate,
        id,
        label: `${candidate.catalog} ${candidate.name}`,
        available: false,
      });
    }
  }

  return sortGlassCandidates([...rowsByIdentity.values()]).map((candidate) =>
    rowsByIdentity.get(getGlassCandidateIdentity(candidate)) as GlassCandidateRow,
  );
}

/**
 * Returns the incumbent candidate catalog, or `undefined` for air, REFL, and
 * ModelGlass. An explicit manufacturer wins over name-based Special detection,
 * preserving Custom identities that happen to reuse a bundled material name.
 */
export function getIncumbentGlassCatalog(
  model: OpticalModel,
  surfaceIndex: number,
  catalogs: AllGlassCatalogsData | undefined,
): GlassCatalogName | undefined {
  const target = surfaceIndex === 0
    ? model.object
    : model.surfaces[surfaceIndex - 1];
  if (target === undefined) {
    return undefined;
  }

  const medium = target.medium.trim();
  if (medium.toUpperCase() === "REFL" || medium.toLowerCase() === "air" || !Number.isNaN(Number.parseFloat(medium))) {
    return undefined;
  }
  if (CATALOG_NAMES.includes(target.manufacturer as CatalogName)) {
    return target.manufacturer as GlassCatalogName;
  }
  if (ELIGIBLE_SPECIAL_GLASS_NAME_SET.has(medium)) {
    return "Special";
  }
  if (target.manufacturer === "" && Object.hasOwn(catalogs?.Custom ?? {}, medium)) {
    return "Custom";
  }
  return undefined;
}
