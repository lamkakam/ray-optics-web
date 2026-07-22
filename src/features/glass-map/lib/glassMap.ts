/**
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
*/
import {
  CATALOG_NAMES,
  type AbbeNumCenterLine,
  type AllGlassCatalogsData,
  type CatalogName,
  type CatalogGlassData,
  type CompleteGlassCatalogsData,
  type GlassMapPlotType,
  type GlassLookupMaps,
  type PartialDispersionType,
  type PlotPoint,
  type SelectedGlass,
} from "@/features/glass-map/types/glassMap";
import { builtInSpecialMaterial } from "@/shared/lib/utils/specialMaterials";

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

const BUILT_IN_SPECIAL_MEDIA = ["CaF2", "Fused silica", "Water"] as const;
const CAF2_ALIASES = ["fluorite", "fluorspar"] as const;

function normalizeLookupKey(value: string): string {
  return value.trim().toLowerCase();
}

export function buildGlassLookupMaps(
  catalogsData: CompleteGlassCatalogsData,
): GlassLookupMaps {
  const manufacturerMap = new Map<string, CatalogName>();
  const mediumMap = new Map<string, { medium: string; manufacturer: string }>();
  const customMediumMap = new Map<string, { medium: string; manufacturer: string }>();

  for (const catalogName of CATALOG_NAMES) {
    manufacturerMap.set(normalizeLookupKey(catalogName), catalogName);

    for (const glassName of Object.keys(catalogsData[catalogName])) {
      if (catalogName === "Special") {
        if (normalizeLookupKey(glassName) !== "refl") {
          mediumMap.set(normalizeLookupKey(glassName), { medium: glassName, manufacturer: "" });
        }
        continue;
      }

      mediumMap.set(`${normalizeLookupKey(catalogName)}:${normalizeLookupKey(glassName)}`, {
        medium: glassName,
        manufacturer: catalogName,
      });

      if (catalogName === "Custom") {
        customMediumMap.set(normalizeLookupKey(glassName), {
          medium: glassName,
          manufacturer: "Custom",
        });
      }
    }
  }

  for (const medium of BUILT_IN_SPECIAL_MEDIA) {
    const lookupKey = normalizeLookupKey(medium);
    if (!mediumMap.has(lookupKey)) {
      mediumMap.set(lookupKey, { medium, manufacturer: "" });
    }
  }
  for (const alias of CAF2_ALIASES) {
    mediumMap.set(normalizeLookupKey(alias), { medium: "CaF2", manufacturer: "" });
  }

  return { manufacturerMap, mediumMap, customMediumMap };
}

export function getEligibleGlassNames(
  catalogsData: AllGlassCatalogsData,
  catalogName: CatalogName,
): string[] {
  return Object.keys(catalogsData[catalogName] ?? {}).filter(
    (glassName) => catalogName !== "Special"
      || !Array.from(builtInSpecialMaterial).some(
        (medium) => medium.toLowerCase() === glassName.toLowerCase(),
      ),
  );
}

export function resolveCatalogGlass(
  catalogsData: CompleteGlassCatalogsData,
  lookupMaps: GlassLookupMaps,
  catalogValue: string,
  glassValue: string,
): SelectedGlass | undefined {
  const catalogName = lookupMaps.manufacturerMap.get(normalizeLookupKey(catalogValue));
  if (catalogName === undefined) return undefined;

  const normalizedGlass = normalizeLookupKey(glassValue);
  const lookupKey = catalogName === "Special"
    ? normalizedGlass
    : `${normalizeLookupKey(catalogName)}:${normalizedGlass}`;
  const resolved = lookupMaps.mediumMap.get(lookupKey);
  if (resolved === undefined || normalizeLookupKey(resolved.medium) !== normalizedGlass) return undefined;

  const glassName = resolved.medium;
  if (!getEligibleGlassNames(catalogsData, catalogName).includes(glassName)) return undefined;

  const data = catalogsData[catalogName][glassName];
  return data === undefined ? undefined : { catalogName, glassName, data };
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
