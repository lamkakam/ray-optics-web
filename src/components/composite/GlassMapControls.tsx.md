# GlassMapControls.tsx

## Purpose
Pure presentational component that renders all filter/selector controls for the Glass Map page. No store access — all state and callbacks are passed as props.

## Props
| Prop | Type | Description |
|------|------|-------------|
| `plotType` | `GlassMapPlotType` | Currently selected plot type |
| `abbeLine` | `AbbeLine` | Selected spectral line (`'d'` or `'e'`) |
| `partialDispersionType` | `PartialDispersionType` | Selected partial dispersion (`'P_F_d'`, `'P_F_e'`, `'P_g_F'`) |
| `enabledCatalogs` | `Record<CatalogName, boolean>` | Per-catalog enabled state |
| `onPlotTypeChange` | `(t: GlassMapPlotType) => void` | Called when plot type radio changes |
| `onAbbeLineChange` | `(l: AbbeLine) => void` | Called when d/e radio changes |
| `onPartialDispersionTypeChange` | `(t: PartialDispersionType) => void` | Called when PD type radio changes |
| `onToggleCatalog` | `(name: CatalogName) => void` | Called when a catalog checkbox changes |

## Sections
1. **Plot Type** — radio group (`refractiveIndex` / `partialDispersion`)
2. **Abbe Line** — radio group (`d` / `e`)
3. **Partial Dispersion** (only visible when `plotType='partialDispersion'`) — radio group for `P_F,d`, `P_F,e`, `P_g,F`
4. **Catalogs** — checkbox per catalog with colored dot indicator using `CATALOG_COLOR_MAP`
