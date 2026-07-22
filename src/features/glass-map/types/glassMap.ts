/**
 * Type definitions and type-derived catalog-name constants for the Glass Map feature.
 *
 * @remarks
 * Runtime helpers and rendering lookup tables live in `features/glass-map/lib/glassMap.ts`.
 */
export const CATALOG_NAMES = ['CDGM', 'Hikari', 'Hoya', 'Ohara', 'Schott', 'Sumita', 'Special', 'Custom'] as const;
/** Canonical built-in and Custom catalog names. */
export type CatalogName = typeof CATALOG_NAMES[number];

/** Supported analytical dispersion-coefficient families. */
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

/** Worker-normalized analytical catalog glass. */
export interface GlassData extends GlassDataBase {
  readonly dispersionCoeffKind: DispersionCoeffKind;
  readonly dispersionCoeffs: readonly number[];
}

/** Worker-normalized tabulated user-defined glass. */
export interface UserDefinedGlassData extends GlassDataBase {
  readonly dispersionCoeffKind: "tabulated";
  readonly dispersionCoeffs: readonly (readonly [number, number])[];
}

/** Name and wavelength/index pairs sent to worker mutation APIs. */
export interface UserDefinedGlassInput {
  readonly name: string;
  readonly pairs: readonly (readonly [number, number])[];
}

/** User-defined material data keyed by canonical label. */
export type UserDefinedMaterialsData = Record<string, UserDefinedGlassData>;
/** Analytical or tabulated catalog glass. */
export type CatalogGlassData = GlassData | UserDefinedGlassData;
/** Possibly incomplete worker catalog payload. */
export type AllGlassCatalogsData = Partial<Record<CatalogName, Record<string, CatalogGlassData>>>;
/** Complete catalog map with every canonical key. */
export type CompleteGlassCatalogsData = Record<CatalogName, Record<string, CatalogGlassData>>;

/** Canonical medium and catalog identity returned by lookup. */
export interface GlassMediumLookupValue {
  readonly medium: string;
  readonly manufacturer: string;
}

/** Case-insensitive manufacturer and medium lookup maps. */
export interface GlassLookupMaps {
  readonly manufacturerMap: ReadonlyMap<string, CatalogName>;
  readonly mediumMap: ReadonlyMap<string, GlassMediumLookupValue>;
  readonly customMediumMap: ReadonlyMap<string, GlassMediumLookupValue>;
}

/** Fraunhofer center line used for Abbe-number axes. */
export type AbbeNumCenterLine = 'd' | 'e';
/** Supported partial-dispersion ordinate. */
export type PartialDispersionType = 'P_Fd' | 'P_fe' | 'P_gF';
/** Refractive-index or partial-dispersion glass-map mode. */
export type GlassMapPlotType = 'refractiveIndex' | 'partialDispersion';

/** Selected catalog and glass identity. */
export interface SelectedGlass {
  readonly catalogName: CatalogName;
  readonly glassName: string;
  readonly data: CatalogGlassData;
}

/** Rendered glass-map point with canonical source identity. */
export interface PlotPoint {
  readonly x: number;
  readonly y: number;
  readonly catalogName: CatalogName;
  readonly glassName: string;
  readonly data: CatalogGlassData;
}
