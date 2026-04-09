# `features/analysis/components/AnalysisPlotView.tsx`

## Purpose

Displays an analysis plot alongside plot-type, field, and wavelength selectors. Most plot types render a base64 PNG image; `diffractionPSF` renders an Apache ECharts v6 canvas scatter plot built from worker-provided axis/grid data. The component handles field-dependent vs. field-independent plot types by disabling the field selector when irrelevant, and shows the wavelength selector only for wavelength-dependent plot types.

## PlotType

```ts
type PlotType =
  | "rayFan"
  | "opdFan"
  | "spotDiagram"
  | "surfaceBySurface3rdOrder"
  | "wavefrontMap"
  | "geoPSF"
  | "diffractionPSF";
```

## Props

```ts
interface AnalysisPlotViewProps {
  fieldOptions: readonly (SelectOption & { value: number })[];
  wavelengthOptions: readonly (SelectOption & { value: number })[];
  selectedFieldIndex: number;
  selectedWavelengthIndex: number;
  selectedPlotType: PlotType;
  plotImageBase64?: string;
  diffractionPsfData?: DiffractionPsfData;
  loading?: boolean;
  onFieldChange: (fieldIndex: number) => void;
  onWavelengthChange: (wavelengthIndex: number) => void;
  onPlotTypeChange: (plotType: PlotType) => void;
  autoHeight?: boolean;
}
```

## Prop Details

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `fieldOptions` | `readonly FieldOption[]` | Yes | Selectable field points for the field dropdown |
| `wavelengthOptions` | `readonly WavelengthOption[]` | Yes | Selectable wavelengths for the wavelength dropdown |
| `selectedFieldIndex` | `number` | Yes | Currently selected field index |
| `selectedWavelengthIndex` | `number` | Yes | Currently selected wavelength index |
| `selectedPlotType` | `PlotType` | Yes | Currently selected plot type |
| `plotImageBase64` | `string` | No | Base64 PNG data for the plot image |
| `diffractionPsfData` | `DiffractionPsfData` | No | Diffraction PSF axis/intensity data used only when `selectedPlotType === "diffractionPSF"` |
| `loading` | `boolean` | No | Shows "Loading plot..." placeholder when `true` |
| `onFieldChange` | `(n) => void` | Yes | Called with the new field index |
| `onWavelengthChange` | `(n) => void` | Yes | Called with the new wavelength index |
| `onPlotTypeChange` | `(t) => void` | Yes | Called with the new plot type |
| `autoHeight` | `boolean` | No | When `true`, image uses `w-full h-auto` instead of `max-h-full` fill layout |

## PLOT_TYPE_CONFIG

Exported config record mapping each `PlotType` to `{ label, fieldDependent, wavelengthDependent? }`:

| PlotType | label | fieldDependent | wavelengthDependent |
|---|---|---|---|
| `rayFan` | "Ray Fan" | true | false |
| `opdFan` | "OPD Fan" | true | false |
| `spotDiagram` | "Spot Diagram" | true | false |
| `surfaceBySurface3rdOrder` | "Surface by Surface 3rd Order Aberr." | false | false |
| `wavefrontMap` | "Wavefront Map" | true | true |
| `geoPSF` | "Geometric PSF" | true | true |
| `diffractionPSF` | "Diffraction PSF" | true | true |

## Key Behaviors

- `PLOT_TYPE_CONFIG` (exported) declares which plot types are field-dependent; the field dropdown is disabled for non-field-dependent types.
- The wavelength selector is only rendered when `PLOT_TYPE_CONFIG[selectedPlotType].wavelengthDependent` is `true`.
- Uses `useScreenBreakpoint` to switch between `compact` and `default` Select variants on small screens.
- Non-diffraction plots use a plain `<img>` tag with a data URI (not `next/image`).
- `diffractionPSF` renders an ECharts canvas chart after a 500ms debounce.
- The diffraction chart measures its parent container, keeps a square plot-area grid (`grid.width === grid.height`), and reserves right-side grid space for the `visualMap` using the standard ECharts layout pattern (`grid.right` plus `visualMap.right`).
- The diffraction chart flattens the worker's `x`/`y`/`z` grid into scatter points `[x, y, log10(max(z, 5e-4))]`.
- The diffraction chart keeps `xAxis` and `yAxis` on the same symmetric extent, configures `tooltip.trigger = "none"` with a cross `axisPointer`, and colors intensity through a continuous `visualMap` using the fixed 11-color palette.
- The diffraction chart places the `visualMap` using the standard ECharts pattern with `visualMap.top = "middle"` and reserved `grid.right` space so the color bar and labels sit outside the plot area, and formats `visualMap` labels back into original intensity values using 2 significant figures.

## Usages

```tsx
import { AnalysisPlotView, PLOT_TYPE_CONFIG, type PlotType } from "@/features/analysis/components/AnalysisPlotView";

// In a container component (e.g., AnalysisPlotContainer)
const handleFieldChange = useCallback(async (value: number) => {
  store.getState().setSelectedFieldIndex(value);
  if (!proxy) return;
  if (!PLOT_TYPE_CONFIG[selectedPlotType].fieldDependent) return;
  store.getState().setPlotLoading(true);
  try {
    const plotFn = buildPlotFn(selectedPlotType, proxy, committedOpticalModel);
    if (plotFn) {
      const plot = await plotFn(value, selectedWavelengthIndex);
      store.getState().setPlotImage(plot);
    }
  } catch {
    onError();
  } finally {
    store.getState().setPlotLoading(false);
  }
}, [proxy, store, selectedPlotType, selectedWavelengthIndex, committedOpticalModel, onError]);

return (
  <AnalysisPlotView
    fieldOptions={fieldOptions}
    wavelengthOptions={wavelengthOptions}
    selectedFieldIndex={selectedFieldIndex}
    selectedWavelengthIndex={selectedWavelengthIndex}
    selectedPlotType={selectedPlotType}
    plotImageBase64={plotImage}
    diffractionPsfData={diffractionPsfData}
    loading={plotLoading}
    onFieldChange={handleFieldChange}
    onWavelengthChange={handleWavelengthChange}
    onPlotTypeChange={handlePlotTypeChange}
    autoHeight={autoHeight}
  />
);
```
