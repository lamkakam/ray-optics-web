# `features/glass-map/lib/glassMap.ts`

## Purpose
Runtime helper functions and rendering constants for the Glass Map feature.

Type definitions and `CATALOG_NAMES` live in `features/glass-map/types/glassMap.ts`.

## Exports

### Constants
- `CATALOG_COLOR_MAP` — maps each `CatalogName` to a hex color string for scatter plot rendering (`Special` -> `#f97316` orange)

### Functions

#### `normalizeGlassData(raw: RawGlassData): GlassData`
Converts snake_case Python API response data to camelCase TypeScript data.

#### `normalizeAllCatalogsData(raw: RawAllGlassCatalogsData): AllGlassCatalogsData`
Iterates over all known catalog names from `CATALOG_NAMES` and normalizes each glass entry.
Gracefully handles missing catalogs by returning an empty object for them.

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
  computePlotPoints,
  normalizeAllCatalogsData,
} from "@/features/glass-map/lib/glassMap";
import type { AllGlassCatalogsData, CatalogName } from "@/features/glass-map/types/glassMap";

const catalogsData = normalizeAllCatalogsData(rawData);

const plotPoints = computePlotPoints(
  catalogsData,
  enabledCatalogs,
  "refractiveIndex",
  "d",
  "P_g_F"
);

const color = CATALOG_COLOR_MAP.Schott;
```
