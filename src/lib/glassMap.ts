export const CATALOG_NAMES = ['CDGM', 'Hikari', 'Hoya', 'Ohara', 'Schott', 'Sumita'] as const;
export type CatalogName = typeof CATALOG_NAMES[number];

export interface GlassData {
  readonly refractiveIndexD: number;
  readonly refractiveIndexE: number;
  readonly abbeNumberD: number;
  readonly abbeNumberE: number;
  readonly dispersionCoefficients: Record<string, number>;
  readonly partialDispersions: {
    readonly P_F_e?: number;
    readonly P_F_d?: number;
    readonly P_g_F?: number;
  };
}

export interface RawGlassData {
  readonly refractive_index_d: number;
  readonly refractive_index_e: number;
  readonly abbe_number_d: number;
  readonly abbe_number_e: number;
  readonly dispersion_coefficients: Record<string, number>;
  readonly partial_dispersions: {
    readonly P_F_e?: number;
    readonly P_F_d?: number;
    readonly P_g_F?: number;
  };
}

export type AllGlassCatalogsData = Record<CatalogName, Record<string, GlassData>>;
export type RawAllGlassCatalogsData = Record<string, Record<string, RawGlassData>>;

export type AbbeLine = 'd' | 'e';
export type PartialDispersionType = 'P_F_d' | 'P_F_e' | 'P_g_F';
export type GlassMapPlotType = 'refractiveIndex' | 'partialDispersion';

export interface SelectedGlass {
  readonly catalogName: CatalogName;
  readonly glassName: string;
  readonly data: GlassData;
}

export interface PlotPoint {
  readonly x: number;
  readonly y: number;
  readonly catalogName: CatalogName;
  readonly glassName: string;
  readonly data: GlassData;
}

export const CATALOG_COLOR_MAP: Record<CatalogName, string> = {
  CDGM: '#3b82f6',
  Hikari: '#10b981',
  Hoya: '#f59e0b',
  Ohara: '#ef4444',
  Schott: '#8b5cf6',
  Sumita: '#ec4899',
};

export function normalizeGlassData(raw: RawGlassData): GlassData {
  return {
    refractiveIndexD: raw.refractive_index_d,
    refractiveIndexE: raw.refractive_index_e,
    abbeNumberD: raw.abbe_number_d,
    abbeNumberE: raw.abbe_number_e,
    dispersionCoefficients: raw.dispersion_coefficients,
    partialDispersions: {
      P_F_e: raw.partial_dispersions.P_F_e,
      P_F_d: raw.partial_dispersions.P_F_d,
      P_g_F: raw.partial_dispersions.P_g_F,
    },
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
  abbeLine: AbbeLine,
  partialDispersionType: PartialDispersionType,
): PlotPoint[] {
  const points: PlotPoint[] = [];

  for (const catalogName of CATALOG_NAMES) {
    if (!enabledCatalogs[catalogName]) continue;
    const catalog = catalogsData[catalogName];
    for (const [glassName, data] of Object.entries(catalog)) {
      const x = abbeLine === 'd' ? data.abbeNumberD : data.abbeNumberE;
      let y: number | undefined;

      if (plotType === 'refractiveIndex') {
        y = abbeLine === 'd' ? data.refractiveIndexD : data.refractiveIndexE;
      } else {
        y = data.partialDispersions[partialDispersionType];
      }

      if (y === undefined) continue;

      points.push({ x, y, catalogName, glassName, data });
    }
  }

  return points;
}
