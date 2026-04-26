# `features/glass-map/components/GlassMapControls.tsx`

## Purpose
Pure presentational component that renders all filter/selector controls for the Glass Map page. No store access — all state and callbacks are passed as props.

## Props
| Prop | Type | Description |
|------|------|-------------|
| `plotType` | `GlassMapPlotType` | Currently selected plot type |
| `abbeNumCenterLine` | `AbbeNumCenterLine` | Selected spectral line (`'d'` or `'e'`) |
| `partialDispersionType` | `PartialDispersionType` | Selected partial dispersion (`'P_F_d'`, `'P_F_e'`, `'P_g_F'`) |
| `enabledCatalogs` | `Record<CatalogName, boolean>` | Per-catalog enabled state |
| `onPlotTypeChange` | `(t: GlassMapPlotType) => void` | Called when plot type radio changes |
| `onAbbeNumCenterLineChange` | `(l: AbbeNumCenterLine) => void` | Called when d/e radio changes |
| `onPartialDispersionTypeChange` | `(t: PartialDispersionType) => void` | Called when PD type radio changes |
| `onToggleCatalog` | `(name: CatalogName) => void` | Called when a catalog checkbox changes |

## Sections
1. **Plot Type** — `RadioInput` group (`refractiveIndex` / `partialDispersion`)
2. **Centre Wavelength** — `RadioInput` group (`d` / `e`), labelled "Centre Wavelength"; options rendered via `MathJax inline`
3. **Partial Dispersion** (only visible when `plotType='partialDispersion'`) — `RadioInput` group for `P_F,d`, `P_F,e`, `P_g,F`; option labels rendered via `MathJax inline` (`\(P_{F,d}\)` etc.)
4. **Catalogs** — shared compact checkbox per catalog with a JSX-composed label that includes a colored dot indicator using `CATALOG_COLOR_MAP` from `features/glass-map/lib/glassMap`; the checkbox keeps a plain-text `aria-label` equal to the catalog name

## MathJax
The component uses `<MathJax inline>` from `better-react-mathjax` for visually rich labels (subscript notation). `RadioOption.labelNode` carries the MathJax node while `RadioOption.label` preserves plain-text `aria-label` for accessibility. **The component does not own a `MathJaxContext`** — the context is provided by the parent (`GlassMapView`). Axis labels in the scatter plot are not affected (they remain plain strings rendered in SVG).

## Usages

```tsx
import { GlassMapControls } from "@/features/glass-map/components/GlassMapControls";

// In a page component (e.g., GlassMapView)
const plotType = useStore(store, (s) => s.plotType);
const abbeNumCenterLine = useStore(store, (s) => s.abbeNumCenterLine);
const partialDispersionType = useStore(store, (s) => s.partialDispersionType);
const enabledCatalogs = useStore(store, (s) => s.enabledCatalogs);
const { setPlotType, setAbbeNumCenterLine, setPartialDispersionType, toggleCatalog } = store.getState();

return (
  <div className="flex flex-col gap-4 p-4">
    <GlassMapControls
      plotType={plotType}
      abbeNumCenterLine={abbeNumCenterLine}
      partialDispersionType={partialDispersionType}
      enabledCatalogs={enabledCatalogs}
      onPlotTypeChange={setPlotType}
      onAbbeNumCenterLineChange={setAbbeNumCenterLine}
      onPartialDispersionTypeChange={setPartialDispersionType}
      onToggleCatalog={toggleCatalog}
    />
  </div>
);
```
