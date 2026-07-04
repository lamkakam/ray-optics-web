# `features/glass-map/lib/glassMap.ts`

## Purpose
Runtime helper functions and rendering constants for the Glass Map feature.

Type definitions and `CATALOG_NAMES` live in `features/glass-map/types/glassMap.ts`.

## Exports

### Constants
- `CATALOG_COLOR_MAP` — maps each `CatalogName` to a hex color string for scatter plot rendering (`Special` -> `#f97316` orange)

### Functions

#### `normalizeGlassData(raw: RawCatalogGlassData): GlassData`
Converts snake_case catalog glass Python API response data to camelCase TypeScript data. User-defined `"tabulated"` raw glass data is intentionally not normalized by this catalog helper.

#### `normalizeAllCatalogsData(raw: RawAllGlassCatalogsData): AllGlassCatalogsData`
Iterates over all known catalog names from `CATALOG_NAMES` and normalizes each glass entry.
Gracefully handles missing catalogs by returning an empty object for them.

#### `buildGlassLookupMaps(catalogsData: AllGlassCatalogsData): GlassLookupMaps`
Builds app-wide case-insensitive lookup maps from normalized catalog data:
- `manufacturerMap` maps trimmed lowercase catalog names to canonical `CatalogName` values.
- `mediumMap` maps trimmed lowercase special-media names, aliases, and `catalog:glass` keys to canonical `{ medium, manufacturer }` values.
- Catalog glasses use keys like `hoya:h-lak52`.
- Special media use an empty manufacturer and include built-ins `CaF2`, `Fused silica`, and `Water`, loaded non-`REFL` `Special` entries, and `fluorite` / `fluorspar` aliases for `CaF2`.
- `REFL` is intentionally not exposed through a lowercase special-media alias.

#### `computePlotPoints(catalogsData, enabledCatalogs, plotType, abbeNumCenterLine, partialDispersionType): PlotPoint[]`
Computes scatter plot points based on current filter and axis settings:
- Skips disabled catalogs
- x-axis: `abbeNumberD` when `abbeNumCenterLine='d'`, else `abbeNumberE`
- y-axis for `refractiveIndex`: `refractiveIndexD` or `refractiveIndexE`
- y-axis for `partialDispersion`: `partialDispersions[partialDispersionType]`

## Usages

```tsx
import {
  CATALOG_COLOR_MAP,
  buildGlassLookupMaps,
  computePlotPoints,
  normalizeAllCatalogsData,
} from "@/features/glass-map/lib/glassMap";
import type { AllGlassCatalogsData, CatalogName } from "@/features/glass-map/types/glassMap";

const catalogsData = normalizeAllCatalogsData(rawData);
const lookupMaps = buildGlassLookupMaps(catalogsData);

const plotPoints = computePlotPoints(
  catalogsData,
  enabledCatalogs,
  "refractiveIndex",
  "d",
  "P_g_F"
);

const color = CATALOG_COLOR_MAP.Schott;
```
