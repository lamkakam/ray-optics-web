# `features/analysis/components/AnalysisPlotContainer.tsx`

## Purpose

Container component that owns all analysis-plot logic: derives field/wavelength select options, maps plot types to worker API calls, and handles user-driven field, wavelength, and plot-type changes. Renders `AnalysisPlotView` as its presentational child and feeds either a base64 image, typed wavefront-map grid data, or typed diffraction-PSF grid data depending on the selected plot type.

## Props

```ts
interface AnalysisPlotContainerProps {
  proxy: PyodideWorkerAPI | undefined;
  onError: () => void;
  autoHeight?: boolean;
}
```

| Prop | Type | Required | Description |
|---|---|---|---|
| `proxy` | `PyodideWorkerAPI \| undefined` | Yes | Pyodide worker proxy; handlers no-op if `undefined` |
| `onError` | `() => void` | Yes | Called when any async plot call throws |
| `autoHeight` | `boolean` | No | Forwarded to `AnalysisPlotView` |

## State

All seven analysis-plot state fields (reactive) are read from `useAnalysisPlotStore` and Zustand's `useStore(store, selector)`:
- `plotImage`, `wavefrontMapData`, `diffractionPsfData`, `plotLoading`, `selectedFieldIndex`, `selectedWavelengthIndex`, `selectedPlotType`.

`committedOpticalModel` is read from `lensStore` via `useLensEditorStore` and `useStore(lensStore, (s) => s.committedOpticalModel)`.

`committedSpecs` is subscribed from `specsStore` via `useSpecsConfiguratorStore` and `useStore(specsStore, (s) => s.committedSpecs)` (return value unused — subscription only) to trigger re-renders when the committed specs change.

## Derived Data

- **`fieldOptions`** — obtained by calling `specsStore.getState().getFieldOptions()` directly in the render body (re-evaluated on each render triggered by `committedSpecs` change). Unit is `°` for `"angle"`, ` mm` for `"height"`.
- **`wavelengthOptions`** — obtained by calling `specsStore.getState().getWavelengthOptions()` directly in the render body.

## Internal Logic

Most plot functions are obtained via `buildPlotFn(plotType, proxy, committedOpticalModel)` from `@/shared/lib/utils/plotFunctions`. For `wavefrontMap` and `diffractionPSF`, the container bypasses the PNG plot path and calls typed worker APIs instead.

### `loadPlot(plotType, fieldIndex, wavelengthIndex)`

Shared async helper used by all three change handlers:

1. Returns immediately when `proxy` or `committedOpticalModel` is missing.
2. Sets `plotLoading(true)`.
3. If `plotType === "diffractionPSF"`, calls `proxy.getDiffractionPSFData(committedOpticalModel, fieldIndex, wavelengthIndex)` and stores the result with `setDiffractionPsfData(...)`.
4. If `plotType === "wavefrontMap"`, calls `proxy.getWavefrontData(committedOpticalModel, fieldIndex, wavelengthIndex)` and stores the result with `setWavefrontMapData(...)`.
5. Otherwise resolves `buildPlotFn(...)`, awaits the base64 PNG result, and stores it with `setPlotImage(...)`.
6. Calls `onError()` in `catch` and always clears `plotLoading` in `finally`.

### `handleFieldChange(value)`

1. Updates `selectedFieldIndex` in store.
2. If `proxy` is undefined or `PLOT_TYPE_CONFIG[selectedPlotType].fieldDependent === false`, returns without plotting.
3. Delegates to `loadPlot(selectedPlotType, value, selectedWavelengthIndex)`.

### `handleWavelengthChange(value)`

Same pattern as `handleFieldChange` but updates `selectedWavelengthIndex` and delegates to `loadPlot(selectedPlotType, selectedFieldIndex, value)`. Only executes the plot call when `fieldDependent === true` (all wavelength-dependent plot types are also field-dependent).

### `handlePlotTypeChange(plotType)`

1. Updates `selectedPlotType` in store.
2. If `proxy` is undefined, returns.
3. Delegates to `loadPlot(plotType, selectedFieldIndex, selectedWavelengthIndex)`.

## Usages

- Used in `LensEditor.tsx`. The container pulls the relevant stores from their providers and only receives `proxy`, `onError`, and `autoHeight` as props.
