import {
  CATALOG_NAMES,
  type AbbeNumCenterLine,
  type AllGlassCatalogsData,
  type CatalogName,
  type GlassData,
  type GlassMapPlotType,
  type PartialDispersionType,
  type PlotPoint,
  type RawAllGlassCatalogsData,
  type RawGlassData,
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

export function normalizeGlassData(raw: RawGlassData): GlassData {
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
