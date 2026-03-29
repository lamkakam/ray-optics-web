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
1. **Plot Type** — `RadioInput` group (`refractiveIndex` / `partialDispersion`)
2. **Centre Wavelength** — `RadioInput` group (`d` / `e`), labelled "Centre Wavelength"; options rendered via `MathJax inline`
3. **Partial Dispersion** (only visible when `plotType='partialDispersion'`) — `RadioInput` group for `P_F,d`, `P_F,e`, `P_g,F`; option labels rendered via `MathJax inline` (`\(P_{F,d}\)` etc.)
4. **Catalogs** — checkbox per catalog with colored dot indicator using `CATALOG_COLOR_MAP`

## MathJax
The component wraps its content in `<MathJaxContext>` from `better-react-mathjax`. `RadioOption.labelNode` is used for visually rich labels (subscript notation) while `RadioOption.label` preserves plain-text `aria-label` for accessibility. Axis labels in the scatter plot are not affected (they remain plain strings rendered in SVG).
