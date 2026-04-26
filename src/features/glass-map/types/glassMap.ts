export const CATALOG_NAMES = ['CDGM', 'Hikari', 'Hoya', 'Ohara', 'Schott', 'Sumita', 'Special'] as const;
export type CatalogName = typeof CATALOG_NAMES[number];

export type DispersionCoeffKind = 'Schott2x6' | 'Sellmeier3T' | 'Sellmeier4T';

export interface GlassData {
  readonly refractiveIndexD: number;
  readonly refractiveIndexE: number;
  readonly abbeNumberD: number;
  readonly abbeNumberE: number;
  readonly partialDispersions: {
    readonly P_F_e: number;
    readonly P_F_d: number;
    readonly P_g_F: number;
  };
  readonly dispersionCoeffKind: DispersionCoeffKind;
  readonly dispersionCoeffs: readonly number[];
}

export interface RawGlassData {
  readonly refractive_index_d: number;
  readonly refractive_index_e: number;
  readonly abbe_number_d: number;
  readonly abbe_number_e: number;
  readonly partial_dispersions: {
    readonly P_F_e: number;
    readonly P_F_d: number;
    readonly P_g_F: number;
  };
  readonly dispersion_coeff_kind: DispersionCoeffKind;
  readonly dispersion_coeffs: readonly number[];
}

export type AllGlassCatalogsData = Record<CatalogName, Record<string, GlassData>>;
export type RawAllGlassCatalogsData = Record<string, Record<string, RawGlassData>>;

export type AbbeNumCenterLine = 'd' | 'e';
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
