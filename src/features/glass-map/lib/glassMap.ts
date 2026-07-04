import {
  CATALOG_NAMES,
  type AbbeNumCenterLine,
  type AllGlassCatalogsData,
  type CatalogName,
  type CatalogGlassData,
  type CompleteGlassCatalogsData,
  type GlassMapPlotType,
  type PartialDispersionType,
  type PlotPoint,
} from "@/features/glass-map/types/glassMap";

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

export function completeAllCatalogsData(raw: AllGlassCatalogsData): CompleteGlassCatalogsData {
  const result = {} as Record<CatalogName, Record<string, CatalogGlassData>>;
  for (const catalogName of CATALOG_NAMES) {
    result[catalogName] = raw[catalogName] ?? {};
  }
  return result;
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
