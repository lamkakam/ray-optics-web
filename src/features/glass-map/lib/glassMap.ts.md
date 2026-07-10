# `features/glass-map/lib/glassMap.ts`

## Purpose
Runtime helper functions and rendering constants for the Glass Map feature.

Type definitions and `CATALOG_NAMES` live in `features/glass-map/types/glassMap.ts`.

## Exports

### Constants
- `CATALOG_COLOR_MAP` — maps each `CatalogName` to a hex color string for scatter plot rendering (`Special` -> `#f97316` orange, `Custom` -> `#64748b` slate)

### Functions

#### `completeAllCatalogsData(raw: AllGlassCatalogsData): CompleteGlassCatalogsData`
Iterates over all known catalog names from `CATALOG_NAMES` and returns the frontend-ready catalog data, filling missing catalogs with empty objects.

#### `computePlotPoints(catalogsData, enabledCatalogs, plotType, abbeNumCenterLine, partialDispersionType): PlotPoint[]`
Computes scatter plot points based on current filter and axis settings:
- Skips disabled catalogs
- Treats missing raw catalog buckets as empty for test and boundary tolerance
- x-axis: `abbeNumberD` when `abbeNumCenterLine='d'`, else `abbeNumberE`
- y-axis for `refractiveIndex`: `refractiveIndexD` or `refractiveIndexE`
- y-axis for `partialDispersion`: `partialDispersions[partialDispersionType]`

#### `getEligibleGlassNames(catalogsData, catalogName): string[]`
Returns stored glass names for a catalog. For `Special`, it excludes the shared built-in special materials (`air` and `REFL`) case-insensitively.

#### `buildGlassLookupMaps(catalogsData): GlassLookupMaps`
Builds the app-wide canonical, trimmed, case-insensitive manufacturer, catalog-medium, Special-medium, and Custom-medium lookup maps. Loaded Special catalog spelling takes precedence over built-in fallback labels (for example, `Fused Silica` is not overwritten by `Fused silica`). This runtime library owns lookup construction; stores only invoke it when catalog data changes.

#### `resolveCatalogGlass(catalogsData, lookupMaps, catalogValue, glassValue): SelectedGlass | undefined`
Resolves catalog and glass names through `manufacturerMap` and `mediumMap`, returning canonical stored spelling and data. Surrounding whitespace and casing differences are accepted. The normalized input must still exactly equal the canonical medium name, so prescription-only aliases and partial matches are rejected. It also applies `getEligibleGlassNames`, preserving glass-map-specific exclusion of built-in `air` and `REFL` materials.

## Usages

```tsx
import {
  CATALOG_COLOR_MAP,
  completeAllCatalogsData,
  computePlotPoints,
} from "@/features/glass-map/lib/glassMap";
import type { AllGlassCatalogsData, CatalogName } from "@/features/glass-map/types/glassMap";

const catalogsData = completeAllCatalogsData(rawData);

const plotPoints = computePlotPoints(
  catalogsData,
  enabledCatalogs,
  "refractiveIndex",
  "d",
  "P_gF"
);

const color = CATALOG_COLOR_MAP.Schott;
```
