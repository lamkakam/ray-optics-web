/**
# `features/glass-map/components/GlassMapControls/GlassMapControls.tsx`

## Sections
1. **Plot Type** — `RadioInput` group (`refractiveIndex` / `partialDispersion`) rendered with `columns={2}` and `layout="compact"`
2. **Centre Wavelength** — `RadioInput` group (`d` / `e`) rendered with `columns={2}` and `layout="compact"`, labelled "Centre Wavelength"; options rendered via `MathJax inline`
3. **Partial Dispersion** (only visible when `plotType='partialDispersion'`) — `RadioInput` group for `P_F,d`, `P_F,e`, `P_g,F` rendered with `columns={3}` and `layout="compact"`; option labels rendered via `MathJax inline` (`\(P_{F,d}\)` etc.)
4. **Catalogs** — shared compact checkbox per catalog rendered in a shrink-wrapped three-column grid (`inline-grid grid-cols-3 gap-x-6 gap-y-1`), with a JSX-composed label that includes a colored dot indicator using `CATALOG_COLOR_MAP` from `features/glass-map/lib/glassMap`; the checkbox keeps a plain-text `aria-label` equal to the catalog name

## MathJax
The component uses `<MathJax inline>` from `better-react-mathjax` for visually rich labels (subscript notation). `RadioOption.labelNode` carries the MathJax node while `RadioOption.label` preserves plain-text `aria-label` for accessibility. **The component does not own a `MathJaxContext`** — the context is provided by the parent (`GlassMapView`). Axis labels in the scatter plot are not affected (they remain plain strings rendered in SVG).
*/
"use client";

import { MathJax } from "better-react-mathjax";
import { CATALOG_COLOR_MAP } from "@/features/glass-map/lib/glassMap";
import { CATALOG_NAMES } from "@/features/glass-map/types/glassMap";
import type { AbbeNumCenterLine, CatalogName, GlassMapPlotType, PartialDispersionType } from "@/features/glass-map/types/glassMap";
import { CheckboxInput } from "@/shared/components/primitives/CheckboxInput";
import { RadioInput } from "@/shared/components/primitives/RadioInput";
import type { RadioOption } from "@/shared/components/primitives/RadioInput";

interface GlassMapControlsProps {
  /** Currently selected plot type */
  readonly plotType: GlassMapPlotType;
  /** Selected spectral line (`'d'` or `'e'`) */
  readonly abbeNumCenterLine: AbbeNumCenterLine;
  /** Selected partial dispersion (`'P_Fd'`, `'P_fe'`, `'P_gF'`) */
  readonly partialDispersionType: PartialDispersionType;
  /** Per-catalog enabled state */
  readonly enabledCatalogs: Record<CatalogName, boolean>;
  /** Called when plot type radio changes */
  readonly onPlotTypeChange: (t: GlassMapPlotType) => void;
  /** Called when d/e radio changes */
  readonly onAbbeNumCenterLineChange: (l: AbbeNumCenterLine) => void;
  /** Called when PD type radio changes */
  readonly onPartialDispersionTypeChange: (t: PartialDispersionType) => void;
  /** Called when a catalog checkbox changes */
  readonly onToggleCatalog: (name: CatalogName) => void;
}

const PLOT_TYPE_OPTIONS: ReadonlyArray<RadioOption<GlassMapPlotType>> = [
  { value: "refractiveIndex", label: "Refractive Index" },
  { value: "partialDispersion", label: "Partial Dispersion" },
];

const ABBE_LINE_OPTIONS: ReadonlyArray<RadioOption<AbbeNumCenterLine>> = [
  { value: "d", label: "d", labelNode: <MathJax inline>{`\\(d\\)`}</MathJax> },
  { value: "e", label: "e", labelNode: <MathJax inline>{`\\(e\\)`}</MathJax> },
];

const PARTIAL_DISPERSION_OPTIONS: ReadonlyArray<RadioOption<PartialDispersionType>> = [
  { value: "P_Fd", label: "P_F,d", labelNode: <MathJax inline>{`\\(P_{F,d}\\)`}</MathJax> },
  { value: "P_fe", label: "P_F,e", labelNode: <MathJax inline>{`\\(P_{F,e}\\)`}</MathJax> },
  { value: "P_gF", label: "P_g,F", labelNode: <MathJax inline>{`\\(P_{g,F}\\)`}</MathJax> },
];

/**
## Purpose
Pure presentational component that renders all filter/selector controls for the Glass Map page. No store access — all state and callbacks are passed as props.

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
*/
export function GlassMapControls({
  plotType,
  abbeNumCenterLine,
  partialDispersionType,
  enabledCatalogs,
  onPlotTypeChange,
  onAbbeNumCenterLineChange,
  onPartialDispersionTypeChange,
  onToggleCatalog,
}: GlassMapControlsProps) {
  return (
    <div className="p-4 flex flex-col gap-4">
      <RadioInput
        name="plotType"
        label="Plot Type"
        options={PLOT_TYPE_OPTIONS}
        value={plotType}
        onChange={onPlotTypeChange}
        columns={2}
        layout="compact"
      />

      <RadioInput
        name="abbeLine"
        label="Centre Wavelength"
        options={ABBE_LINE_OPTIONS}
        value={abbeNumCenterLine}
        onChange={onAbbeNumCenterLineChange}
        columns={2}
        layout="compact"
      />

      {plotType === "partialDispersion" && (
        <RadioInput
          name="partialDispersionType"
          label="Partial Dispersion"
          options={PARTIAL_DISPERSION_OPTIONS}
          value={partialDispersionType}
          onChange={onPartialDispersionTypeChange}
          columns={3}
          layout="compact"
        />
      )}

      {/* Catalog filter */}
      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
          Catalogs
        </legend>
        <div className="inline-grid grid-cols-3 gap-x-6 gap-y-1">
          {CATALOG_NAMES.map((name) => (
            <CheckboxInput
              key={name}
              id={`catalog-${name}`}
              ariaLabel={name}
              checked={enabledCatalogs[name]}
              label={(
                <div className="flex flex-1 items-center gap-2 text-left text-sm leading-5">
                  <span
                    data-testid={`catalog-dot-${name}`}
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: CATALOG_COLOR_MAP[name] }}
                  />
                  <span>{name}</span>
                </div>
              )}
              onChange={() => onToggleCatalog(name)}
            />
          ))}
        </div>
      </fieldset>
    </div>
  );
}
