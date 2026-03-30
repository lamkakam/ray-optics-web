# glassMap.ts — Spec

## Purpose
Types, constants, and pure helper functions for the Glass Map feature.

## Exports

### Constants
- `CATALOG_NAMES` — readonly tuple of 6 catalog names: `['CDGM', 'Hikari', 'Hoya', 'Ohara', 'Schott', 'Sumita']`
- `CATALOG_COLOR_MAP` — maps each `CatalogName` to a hex color string for scatter plot rendering

### Types
- `CatalogName` — union of the 6 catalog name strings
- `GlassData` — normalized glass properties (camelCase):
  - `refractiveIndexD`, `refractiveIndexE` — refractive index at d/e lines
  - `abbeNumberD`, `abbeNumberE` — Abbe number at d/e lines
  - `partialDispersions` — required `P_F_e`, `P_F_d`, `P_g_F` (all always present)
- `RawGlassData` — snake_case mirror from Python API
- `AllGlassCatalogsData` — `Record<CatalogName, Record<string, GlassData>>`
- `RawAllGlassCatalogsData` — `Record<string, Record<string, RawGlassData>>`
- `AbbeNumCenterLine` — `'d' | 'e'`
- `PartialDispersionType` — `'P_F_d' | 'P_F_e' | 'P_g_F'`
- `GlassMapPlotType` — `'refractiveIndex' | 'partialDispersion'`
- `SelectedGlass` — `{ catalogName, glassName, data }`
- `PlotPoint` — `{ x, y, catalogName, glassName, data }`

### Functions

#### `normalizeGlassData(raw: RawGlassData): GlassData`
Converts snake_case Python API response to camelCase TypeScript types.

#### `normalizeAllCatalogsData(raw: RawAllGlassCatalogsData): AllGlassCatalogsData`
Iterates over all 6 known catalog names and normalizes each glass entry.
Gracefully handles missing catalogs (returns empty object for them).

#### `computePlotPoints(catalogsData, enabledCatalogs, plotType, abbeNumCenterLine, partialDispersionType): PlotPoint[]`
Computes scatter plot points based on current filter/axis settings:
- Skips disabled catalogs
- x-axis: `abbeNumberD` when `abbeNumCenterLine='d'`, else `abbeNumberE`
- y-axis (refractiveIndex): `refractiveIndexD` or `refractiveIndexE`
- y-axis (partialDispersion): `partialDispersions[partialDispersionType]`
