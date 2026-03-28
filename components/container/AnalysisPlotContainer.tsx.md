# `components/container/AnalysisPlotContainer.tsx`

## Purpose

Container component that owns all analysis-plot logic: derives field/wavelength select options, maps plot types to worker API calls, and handles user-driven field, wavelength, and plot-type changes. Renders `AnalysisPlotView` as its presentational child.

## Props

```ts
interface AnalysisPlotContainerProps {
  store: StoreApi<AnalysisPlotState>;
  proxy: PyodideWorkerAPI | undefined;
  committedOpticalModel: OpticalModel | undefined;
  committedSpecs: OpticalSpecs;
  onError: () => void;
  autoHeight?: boolean;
}
```

| Prop | Type | Required | Description |
|---|---|---|---|
| `store` | `StoreApi<AnalysisPlotState>` | Yes | Zustand store for analysis-plot state (plotImage, plotLoading, selected indices, selectedPlotType) |
| `proxy` | `PyodideWorkerAPI \| undefined` | Yes | Pyodide worker proxy; handlers no-op if `undefined` |
| `committedOpticalModel` | `OpticalModel \| undefined` | Yes | The last committed optical model; plot functions no-op if `undefined` |
| `committedSpecs` | `OpticalSpecs` | Yes | Used to derive field and wavelength select options |
| `onError` | `() => void` | Yes | Called when any async plot call throws |
| `autoHeight` | `boolean` | No | Forwarded to `AnalysisPlotView` |

## State

All five state fields are read from `store` via `useStore(store, selector)`:
- `plotImage`, `plotLoading`, `selectedFieldIndex`, `selectedWavelengthIndex`, `selectedPlotType`

## Derived Data

- **`fieldOptions`** — derived from `committedSpecs.field` (`fields`, `maxField`, `type`). Unit is `°` for `"angle"`, ` mm` for `"height"`.
- **`wavelengthOptions`** — derived from `committedSpecs.wavelengths.weights`.

## Internal Logic

### `getPlotFunction(plotType, model?)`

Maps a `PlotType` to a `(fieldIndex, wavelengthIndex) => Promise<string>` function using the proxy and committed model. Returns `undefined` when `proxy` or model is missing.

| PlotType | Proxy call |
|---|---|
| `rayFan` | `proxy.plotRayFan(model, fi)` |
| `opdFan` | `proxy.plotOpdFan(model, fi)` |
| `spotDiagram` | `proxy.plotSpotDiagram(model, fi)` |
| `surfaceBySurface3rdOrder` | `proxy.plotSurfaceBySurface3rdOrderAberr(model)` |
| `wavefrontMap` | `proxy.plotWavefrontMap(model, fi, wi)` |
| `geoPSF` | `proxy.plotGeoPSF(model, fi, wi)` |
| `diffractionPSF` | `proxy.plotDiffractionPSF(model, fi, wi)` |

### `handleFieldChange(value)`

1. Updates `selectedFieldIndex` in store.
2. If `proxy` is undefined or `PLOT_TYPE_CONFIG[selectedPlotType].fieldDependent === false`, returns without plotting.
3. Sets `plotLoading(true)`, calls `plotFn(value, selectedWavelengthIndex)`, updates `plotImage`.
4. Sets `plotLoading(false)` in `finally`; calls `onError()` in `catch`.

### `handleWavelengthChange(value)`

Same pattern as `handleFieldChange` but updates `selectedWavelengthIndex` and calls `plotFn(selectedFieldIndex, value)`. Only executes the plot call when `fieldDependent === true` (all wavelength-dependent plot types are also field-dependent).

### `handlePlotTypeChange(plotType)`

1. Updates `selectedPlotType` in store.
2. If `proxy` is undefined, returns.
3. Sets `plotLoading(true)`, calls `plotFn(selectedFieldIndex, selectedWavelengthIndex)`, updates `plotImage`.
4. Sets `plotLoading(false)` in `finally`; calls `onError()` in `catch`.

## Usages

- Used in `app/page.tsx` replacing the inline `AnalysisPlotView` node. `page.tsx` creates `analysisPlotStore` and passes it along with `proxy`, `committedOpticalModel`, `committedSpecs`, `onError`, and `autoHeight`.
