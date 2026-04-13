# `shared/lib/types/glassMap.ts`

## Purpose
Types, constants, and pure helper functions for the Glass Map feature.

## Exports

### Constants
- `CATALOG_NAMES` — readonly tuple of 7 catalog names: `['CDGM', 'Hikari', 'Hoya', 'Ohara', 'Schott', 'Sumita', 'Special']`
- `CATALOG_COLOR_MAP` — maps each `CatalogName` to a hex color string for scatter plot rendering (`Special` → `#f97316` orange)

### Types
- `CatalogName` — union of the 7 catalog name strings
- `DispersionCoeffKind` — `'Schott2x6' | 'Sellmeier3T' | 'Sellmeier4T'`
- `GlassData` — normalized glass properties (camelCase):
  - `refractiveIndexD`, `refractiveIndexE` — refractive index at d/e lines
  - `abbeNumberD`, `abbeNumberE` — Abbe number at d/e lines
  - `partialDispersions` — required `P_F_e`, `P_F_d`, `P_g_F` (all always present)
  - `dispersionCoeffKind` — `DispersionCoeffKind` (`'Schott2x6'`, `'Sellmeier3T'`, or `'Sellmeier4T'`)
  - `dispersionCoeffs` — readonly array of dispersion coefficients: 8 terms for `'Schott2x6'`, 6 terms for `'Sellmeier3T'`, 8 terms for `'Sellmeier4T'`
- `RawGlassData` — snake_case mirror from Python API (includes `dispersion_coeff_kind`, `dispersion_coeffs`)
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
Iterates over all 7 known catalog names and normalizes each glass entry.
Gracefully handles missing catalogs (returns empty object for them).

#### `computePlotPoints(catalogsData, enabledCatalogs, plotType, abbeNumCenterLine, partialDispersionType): PlotPoint[]`
Computes scatter plot points based on current filter/axis settings:
- Skips disabled catalogs
- x-axis: `abbeNumberD` when `abbeNumCenterLine='d'`, else `abbeNumberE`
- y-axis (refractiveIndex): `refractiveIndexD` or `refractiveIndexE`
- y-axis (partialDispersion): `partialDispersions[partialDispersionType]`

## Usages

```tsx
import {
  CATALOG_NAMES,
  CATALOG_COLOR_MAP,
  normalizeAllCatalogsData,
  computePlotPoints,
} from "@/shared/lib/types/glassMap";
import type { AllGlassCatalogsData } from "@/shared/lib/types/glassMap";

// Load and normalize glass catalogs from worker
const rawData = await proxy.getAllGlassCatalogsData();
const catalogsData = normalizeAllCatalogsData(rawData);
glassMapStore.getState().setCatalogsData(catalogsData);

// Render glass map plot
function GlassMapPlot({
  catalogsData,
  enabledCatalogs,
  plotType,
}: {
  catalogsData: AllGlassCatalogsData;
  enabledCatalogs: Record<CatalogName, boolean>;
  plotType: GlassMapPlotType;
}) {
  // Compute plot points based on current settings
  const plotPoints = computePlotPoints(
    catalogsData,
    enabledCatalogs,
    plotType,
    "d", // abbeNumCenterLine
    "P_g_F" // partialDispersionType
  );

  return (
    <ScatterPlot
      data={plotPoints}
      colorMap={CATALOG_COLOR_MAP}
      xLabel="Abbe Number"
      yLabel={plotType === "refractiveIndex" ? "Refractive Index" : "Partial Dispersion"}
    />
  );
}

// Use catalog names in UI
<div>
  {CATALOG_NAMES.map((catalog) => (
    <label key={catalog}>
      <input type="checkbox" defaultChecked />
      {catalog}
    </label>
  ))}
</div>
```
