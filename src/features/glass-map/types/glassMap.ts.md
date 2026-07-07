# `features/glass-map/types/glassMap.ts`

## Purpose
Type definitions and type-derived catalog-name constants for the Glass Map feature.

Runtime helpers and rendering lookup tables live in `features/glass-map/lib/glassMap.ts`.

## Exports

### Constants
- `CATALOG_NAMES` — readonly tuple of 8 catalog names: `['CDGM', 'Hikari', 'Hoya', 'Ohara', 'Schott', 'Sumita', 'Special', 'Custom']`

### Types
- `CatalogName` — union of the 8 catalog name strings, derived from `CATALOG_NAMES`
- `DispersionCoeffKind` — catalog glass dispersion coefficient kinds: `'Schott2x6' | 'Sellmeier3T' | 'Sellmeier4T'`
- `GlassData` — catalog/UI glass properties received directly from Python in frontend-ready camelCase:
  - `refractiveIndexD`, `refractiveIndexE` — refractive index at d/e lines
  - `abbeNumberD`, `abbeNumberE` — Abbe number at d/e lines
  - `partialDispersions` — required `P_fe`, `P_Fd`, `P_gF` (all always present)
  - `dispersionCoeffKind` — `DispersionCoeffKind` (`'Schott2x6'`, `'Sellmeier3T'`, or `'Sellmeier4T'`)
  - `dispersionCoeffs` — readonly array of dispersion coefficients: 8 terms for `'Schott2x6'`, 6 terms for `'Sellmeier3T'`, 8 terms for `'Sellmeier4T'`
- `GlassDataBase` — shared camelCase glass properties from Python APIs:
  - `refractiveIndexD`, `refractiveIndexE`
  - `abbeNumberD`, `abbeNumberE`
  - `partialDispersions` with required `P_fe`, `P_Fd`, `P_gF`
- `UserDefinedGlassData` — user-defined glass data with `dispersionCoeffKind: "tabulated"` and wavelength/index tuple coefficients.
- `UserDefinedGlassInput` — input for worker-side user-defined glass mutations: `{ name, pairs }`, where `pairs` is readonly wavelength/index tuples.
- `CatalogGlassData` — union of built-in catalog `GlassData` and tabulated `UserDefinedGlassData`
- `AllGlassCatalogsData` — partial raw catalog map accepted at boundaries before normalization
- `CompleteGlassCatalogsData` — complete catalog map with every `CatalogName`, used for store state after normalization
- `UserDefinedMaterialsData` — bare user-defined glass map: `Record<string, UserDefinedGlassData>`
- `GlassMediumLookupValue` — canonical material lookup result: `{ medium, manufacturer }`
- `GlassLookupMaps` — app-wide case-insensitive material lookup maps: `manufacturerMap`, catalog/special `mediumMap`, and label-only `customMediumMap` for user-defined glass
- `AbbeNumCenterLine` — `'d' | 'e'`
- `PartialDispersionType` — `'P_Fd' | 'P_fe' | 'P_gF'`
- `GlassMapPlotType` — `'refractiveIndex' | 'partialDispersion'`
- `SelectedGlass` — `{ catalogName, glassName, data }`, where `data` may be built-in or user-defined glass data
- `PlotPoint` — `{ x, y, catalogName, glassName, data }`, where `data` may be built-in or user-defined glass data

## Usages

```tsx
import { CATALOG_NAMES } from "@/features/glass-map/types/glassMap";
import type {
  AllGlassCatalogsData,
  CatalogName,
  GlassMapPlotType,
} from "@/features/glass-map/types/glassMap";

function CatalogToggles({
  enabledCatalogs,
  toggleCatalog,
}: {
  enabledCatalogs: Record<CatalogName, boolean>;
  toggleCatalog: (name: CatalogName) => void;
}) {
  return (
    <div>
      {CATALOG_NAMES.map((catalog) => (
        <label key={catalog}>
          <input
            type="checkbox"
            checked={enabledCatalogs[catalog]}
            onChange={() => toggleCatalog(catalog)}
          />
          {catalog}
        </label>
      ))}
    </div>
  );
}
```
