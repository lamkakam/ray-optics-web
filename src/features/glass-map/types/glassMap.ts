export const CATALOG_NAMES = ['CDGM', 'Hikari', 'Hoya', 'Ohara', 'Schott', 'Sumita', 'Special', 'Custom'] as const;
export type CatalogName = typeof CATALOG_NAMES[number];

export type DispersionCoeffKind = 'Schott2x6' | 'Sellmeier3T' | 'Sellmeier4T';

interface GlassDataBase {
  readonly refractiveIndexD: number;
  readonly refractiveIndexE: number;
  readonly abbeNumberD: number;
  readonly abbeNumberE: number;
  readonly partialDispersions: {
    readonly P_fe: number;
    readonly P_Fd: number;
    readonly P_gF: number;
  };
}

export interface GlassData extends GlassDataBase {
  readonly dispersionCoeffKind: DispersionCoeffKind;
  readonly dispersionCoeffs: readonly number[];
}

export interface UserDefinedGlassData extends GlassDataBase {
  readonly dispersionCoeffKind: "tabulated";
  readonly dispersionCoeffs: readonly (readonly [number, number])[];
}

export interface UserDefinedGlassInput {
  readonly name: string;
  readonly pairs: readonly (readonly [number, number])[];
}

export type UserDefinedMaterialsData = Record<string, UserDefinedGlassData>;
export type CatalogGlassData = GlassData | UserDefinedGlassData;
export type AllGlassCatalogsData = Partial<Record<CatalogName, Record<string, CatalogGlassData>>>;
export type CompleteGlassCatalogsData = Record<CatalogName, Record<string, CatalogGlassData>>;

export interface GlassMediumLookupValue {
  readonly medium: string;
  readonly manufacturer: string;
}

export interface GlassLookupMaps {
  readonly manufacturerMap: ReadonlyMap<string, CatalogName>;
  readonly mediumMap: ReadonlyMap<string, GlassMediumLookupValue>;
}

export type AbbeNumCenterLine = 'd' | 'e';
export type PartialDispersionType = 'P_Fd' | 'P_fe' | 'P_gF';
export type GlassMapPlotType = 'refractiveIndex' | 'partialDispersion';

export interface SelectedGlass {
  readonly catalogName: CatalogName;
  readonly glassName: string;
  readonly data: CatalogGlassData;
}

export interface PlotPoint {
  readonly x: number;
  readonly y: number;
  readonly catalogName: CatalogName;
  readonly glassName: string;
  readonly data: CatalogGlassData;
}
