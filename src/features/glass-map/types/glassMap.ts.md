# `features/glass-map/types/glassMap.ts`

## Purpose
Type definitions and type-derived catalog-name constants for the Glass Map feature.

Runtime helpers and rendering lookup tables live in `features/glass-map/lib/glassMap.ts`.

## Exports

### Constants
- `CATALOG_NAMES` — readonly tuple of 7 catalog names: `['CDGM', 'Hikari', 'Hoya', 'Ohara', 'Schott', 'Sumita', 'Special']`

### Types
- `CatalogName` — union of the 7 catalog name strings, derived from `CATALOG_NAMES`
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
