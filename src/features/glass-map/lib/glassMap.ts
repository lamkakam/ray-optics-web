/**
 * Runtime helper functions and rendering constants for the Glass Map feature.
 *
 * @remarks
 * Type definitions and `CATALOG_NAMES` live in `features/glass-map/types/glassMap.ts`.
 */
import {
  CATALOG_NAMES,
  type AbbeNumCenterLine,
  type AllGlassCatalogsData,
  type CatalogName,
  type CatalogGlassData,
  type CompleteGlassCatalogsData,
  type GlassMapPlotType,
  type GlassLookupMaps,
  type PartialDispersionType,
  type PlotPoint,
  type SelectedGlass,
} from "@/features/glass-map/types/glassMap";
import { builtInSpecialMaterial } from "@/shared/lib/utils/specialMaterials";

/** Stable display color assigned to each glass catalog. */
export const CATALOG_COLOR_MAP: Record<CatalogName, string> = {
  CDGM: "#3b82f6",
  Hikari: "#10b981",
  Hoya: "#f59e0b",
  Ohara: "#ef4444",
  Schott: "#8b5cf6",
  Sumita: "#ec4899",
  Special: "#f97316",
  Custom: "#64748b",
};

/** Fills missing catalog keys with empty objects. */
export function completeAllCatalogsData(raw: AllGlassCatalogsData): CompleteGlassCatalogsData {
  const result = {} as Record<CatalogName, Record<string, CatalogGlassData>>;
  for (const catalogName of CATALOG_NAMES) {
    result[catalogName] = raw[catalogName] ?? {};
  }
  return result;
}

const BUILT_IN_SPECIAL_MEDIA = ["CaF2", "Fused silica", "Water"] as const;
const CAF2_ALIASES = ["fluorite", "fluorspar"] as const;

function normalizeLookupKey(value: string): string {
  return value.trim().toLowerCase();
}

/** Builds case-insensitive manufacturer and medium lookup maps. */
export function buildGlassLookupMaps(
  catalogsData: CompleteGlassCatalogsData,
): GlassLookupMaps {
  const manufacturerMap = new Map<string, CatalogName>();
  const mediumMap = new Map<string, { medium: string; manufacturer: string }>();
  const customMediumMap = new Map<string, { medium: string; manufacturer: string }>();

  for (const catalogName of CATALOG_NAMES) {
    manufacturerMap.set(normalizeLookupKey(catalogName), catalogName);

    for (const glassName of Object.keys(catalogsData[catalogName])) {
      if (catalogName === "Special") {
        if (normalizeLookupKey(glassName) !== "refl") {
          mediumMap.set(normalizeLookupKey(glassName), { medium: glassName, manufacturer: "" });
        }
        continue;
      }

      mediumMap.set(`${normalizeLookupKey(catalogName)}:${normalizeLookupKey(glassName)}`, {
        medium: glassName,
        manufacturer: catalogName,
      });

      if (catalogName === "Custom") {
        customMediumMap.set(normalizeLookupKey(glassName), {
          medium: glassName,
          manufacturer: "Custom",
        });
      }
    }
  }

  for (const medium of BUILT_IN_SPECIAL_MEDIA) {
    const lookupKey = normalizeLookupKey(medium);
    if (!mediumMap.has(lookupKey)) {
      mediumMap.set(lookupKey, { medium, manufacturer: "" });
    }
  }
  for (const alias of CAF2_ALIASES) {
    mediumMap.set(normalizeLookupKey(alias), { medium: "CaF2", manufacturer: "" });
  }

  return { manufacturerMap, mediumMap, customMediumMap };
}

/** Returns selectable glass names for one catalog. */
export function getEligibleGlassNames(
  catalogsData: AllGlassCatalogsData,
  catalogName: CatalogName,
): string[] {
  return Object.keys(catalogsData[catalogName] ?? {}).filter(
    (glassName) => catalogName !== "Special"
      || !Array.from(builtInSpecialMaterial).some(
        (medium) => medium.toLowerCase() === glassName.toLowerCase(),
      ),
  );
}

/** Resolves a catalog glass through canonical lookup maps. */
export function resolveCatalogGlass(
  catalogsData: CompleteGlassCatalogsData,
  lookupMaps: GlassLookupMaps,
  catalogValue: string,
  glassValue: string,
): SelectedGlass | undefined {
  const catalogName = lookupMaps.manufacturerMap.get(normalizeLookupKey(catalogValue));
  if (catalogName === undefined) return undefined;

  const normalizedGlass = normalizeLookupKey(glassValue);
  const lookupKey = catalogName === "Special"
    ? normalizedGlass
    : `${normalizeLookupKey(catalogName)}:${normalizedGlass}`;
  const resolved = lookupMaps.mediumMap.get(lookupKey);
  if (resolved === undefined || normalizeLookupKey(resolved.medium) !== normalizedGlass) return undefined;

  const glassName = resolved.medium;
  if (!getEligibleGlassNames(catalogsData, catalogName).includes(glassName)) return undefined;

  const data = catalogsData[catalogName][glassName];
  return data === undefined ? undefined : { catalogName, glassName, data };
}

/** Converts enabled catalog glasses to refractive-index or partial-dispersion plot points. */
export function computePlotPoints(
  catalogsData: AllGlassCatalogsData,
  enabledCatalogs: Record<CatalogName, boolean>,
  plotType: GlassMapPlotType,
  abbeNumCenterLine: AbbeNumCenterLine,
  partialDispersionType: PartialDispersionType,
): PlotPoint[] {
  const points: PlotPoint[] = [];

  for (const catalogName of CATALOG_NAMES) {
    if (!enabledCatalogs[catalogName]) continue;
    const catalog = catalogsData[catalogName] ?? {};
    for (const [glassName, data] of Object.entries(catalog)) {
      const x = abbeNumCenterLine === "d" ? data.abbeNumberD : data.abbeNumberE;
      let y: number | undefined;

      if (plotType === "refractiveIndex") {
        y = abbeNumCenterLine === "d" ? data.refractiveIndexD : data.refractiveIndexE;
      } else {
        y = data.partialDispersions[partialDispersionType];
      }

      if (y === undefined) continue;

      points.push({ x, y, catalogName, glassName, data });
    }
  }

  return points;
}
