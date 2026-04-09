# `features/analysis/components/AnalysisPlotView.tsx`

## Purpose

Displays an analysis plot alongside plot-type, field, and wavelength selectors. Most plot types originally rendered a base64 PNG image; `rayFan`, `opdFan`, `spotDiagram`, `surfaceBySurface3rdOrder`, `wavefrontMap`, `geoPSF`, and `diffractionPSF` now delegate to dedicated ECharts chart components that render typed data instead of PNGs.

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
  surfaceBySurface3rdOrderData?: SeidelSurfaceBySurfaceData;
  rayFanData?: RayFanData;
  opdFanData?: OpdFanData;
  spotDiagramData?: SpotDiagramData;
  diffractionPsfData?: DiffractionPsfData;
  wavefrontMapData?: WavefrontMapData;
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
| `surfaceBySurface3rdOrderData` | `SeidelSurfaceBySurfaceData` | No | Per-surface Seidel aberration matrix used only when `selectedPlotType === "surfaceBySurface3rdOrder"` |
| `rayFanData` | `RayFanData` | No | Per-wavelength ray-fan series used only when `selectedPlotType === "rayFan"` |
| `opdFanData` | `OpdFanData` | No | Per-wavelength OPD fan series used only when `selectedPlotType === "opdFan"` |
| `spotDiagramData` | `SpotDiagramData` | No | Per-wavelength spot-diagram point clouds used only when `selectedPlotType === "spotDiagram"` |
| `geoPsfData` | `GeoPsfData` | No | Geometric PSF point-cloud data used only when `selectedPlotType === "geoPSF"` |
| `diffractionPsfData` | `DiffractionPsfData` | No | Diffraction PSF axis/intensity data used only when `selectedPlotType === "diffractionPSF"` |
| `wavefrontMapData` | `WavefrontMapData` | No | Wavefront-map axis/OPD data used only when `selectedPlotType === "wavefrontMap"` |
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
- PNG-based plots still use a plain `<img>` tag with a data URI (not `next/image`) for legacy image-backed modes.
- `surfaceBySurface3rdOrder` renders `SurfaceBySurface3rdOrderChart` only when `surfaceBySurface3rdOrderData` is present. The chart uses the Seidel `surfaceBySurface` payload already fetched from the worker instead of the old PNG.
- `rayFan` renders `RayFanChart` only when `rayFanData` is present, passing wavelength labels from `wavelengthOptions` so each wavelength line pair is named by the actual wavelength rather than the wavelength index.
- `opdFan` renders `OpdFanChart` only when `opdFanData` is present, passing wavelength labels from `wavelengthOptions` so each wavelength line pair is named by the actual wavelength rather than the wavelength index.
- `spotDiagram` renders `SpotDiagramChart` only when `spotDiagramData` is present, passing wavelength labels from `wavelengthOptions` so each series is named by the actual wavelength rather than the wavelength index.
- `wavefrontMap` renders `WavefrontMapChart` only when `wavefrontMapData` is present.
- `geoPSF` renders `GeoPsfChart` only when `geoPsfData` is present.
- `diffractionPSF` renders `DiffractionPsfChart` only when `diffractionPsfData` is present.
- `AnalysisPlotView` never imports Apache ECharts directly; chart-specific measurement, debounce, and option-building logic live in dedicated feature-local modules.

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
