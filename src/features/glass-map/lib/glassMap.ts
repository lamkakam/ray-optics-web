import {
  CATALOG_NAMES,
  type AbbeNumCenterLine,
  type AllGlassCatalogsData,
  type CatalogName,
  type GlassData,
  type GlassLookupMaps,
  type GlassMapPlotType,
  type PartialDispersionType,
  type PlotPoint,
  type RawAllGlassCatalogsData,
  type RawCatalogGlassData,
} from "@/features/glass-map/types/glassMap";

export const CATALOG_COLOR_MAP: Record<CatalogName, string> = {
  CDGM: "#3b82f6",
  Hikari: "#10b981",
  Hoya: "#f59e0b",
  Ohara: "#ef4444",
  Schott: "#8b5cf6",
  Sumita: "#ec4899",
  Special: "#f97316",
};

const BUILT_IN_SPECIAL_MEDIA = ["CaF2", "Fused silica", "Water"] as const;
const CAF2_ALIASES = ["fluorite", "fluorspar"] as const;

function normalizeLookupKey(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeGlassData(raw: RawCatalogGlassData): GlassData {
  return {
    refractiveIndexD: raw.refractive_index_d,
    refractiveIndexE: raw.refractive_index_e,
    abbeNumberD: raw.abbe_number_d,
    abbeNumberE: raw.abbe_number_e,
    partialDispersions: {
      P_F_e: raw.partial_dispersions.P_F_e,
      P_F_d: raw.partial_dispersions.P_F_d,
      P_g_F: raw.partial_dispersions.P_g_F,
    },
    dispersionCoeffKind: raw.dispersion_coeff_kind,
    dispersionCoeffs: raw.dispersion_coeffs,
  };
}

export function normalizeAllCatalogsData(raw: RawAllGlassCatalogsData): AllGlassCatalogsData {
  const result = {} as Record<CatalogName, Record<string, GlassData>>;
  for (const catalogName of CATALOG_NAMES) {
    const rawCatalog = raw[catalogName] ?? {};
    const catalog: Record<string, GlassData> = {};
    for (const [glassName, rawGlass] of Object.entries(rawCatalog)) {
      catalog[glassName] = normalizeGlassData(rawGlass);
    }
    result[catalogName] = catalog;
  }
  return result as AllGlassCatalogsData;
}

export function buildGlassLookupMaps(catalogsData: AllGlassCatalogsData): GlassLookupMaps {
  const manufacturerMap = new Map<string, CatalogName>();
  const mediumMap = new Map<string, { medium: string; manufacturer: string }>();

  for (const catalogName of CATALOG_NAMES) {
    manufacturerMap.set(normalizeLookupKey(catalogName), catalogName);

    for (const glassName of Object.keys(catalogsData[catalogName])) {
      if (catalogName === "Special") {
        if (glassName !== "REFL") {
          mediumMap.set(normalizeLookupKey(glassName), { medium: glassName, manufacturer: "" });
        }
        continue;
      }

      mediumMap.set(`${normalizeLookupKey(catalogName)}:${normalizeLookupKey(glassName)}`, {
        medium: glassName,
        manufacturer: catalogName,
      });
    }
  }

  for (const medium of BUILT_IN_SPECIAL_MEDIA) {
    mediumMap.set(normalizeLookupKey(medium), { medium, manufacturer: "" });
  }

  for (const alias of CAF2_ALIASES) {
    mediumMap.set(normalizeLookupKey(alias), { medium: "CaF2", manufacturer: "" });
  }

  return { manufacturerMap, mediumMap };
}

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
    const catalog = catalogsData[catalogName];
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
