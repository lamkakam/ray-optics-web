# `components/container/AnalysisPlotContainer.tsx`

## Purpose

Container component that owns all analysis-plot logic: derives field/wavelength select options, maps plot types to worker API calls, and handles user-driven field, wavelength, and plot-type changes. Renders `AnalysisPlotView` as its presentational child.

## Props

```ts
interface AnalysisPlotContainerProps {
  store: StoreApi<AnalysisPlotState>;
  proxy: PyodideWorkerAPI | undefined;
  lensStore: StoreApi<LensEditorState>;
  specsStore: StoreApi<SpecsConfigurerState>;
  onError: () => void;
  autoHeight?: boolean;
}
```

| Prop | Type | Required | Description |
|---|---|---|---|
| `store` | `StoreApi<AnalysisPlotState>` | Yes | Zustand store for analysis-plot state (plotImage, plotLoading, selected indices, selectedPlotType) |
| `proxy` | `PyodideWorkerAPI \| undefined` | Yes | Pyodide worker proxy; handlers no-op if `undefined` |
| `lensStore` | `StoreApi<LensEditorState>` | Yes | Lens editor store; `committedOpticalModel` is subscribed to obtain the last committed model |
| `specsStore` | `StoreApi<SpecsConfigurerState>` | Yes | Specs configurer store; `committedSpecs` is subscribed to trigger re-renders; `getFieldOptions()` and `getWavelengthOptions()` are called to derive select options |
| `onError` | `() => void` | Yes | Called when any async plot call throws |
| `autoHeight` | `boolean` | No | Forwarded to `AnalysisPlotView` |

## State

All five analysis-plot state fields are read from `store` via `useStore(store, selector)`:
- `plotImage`, `plotLoading`, `selectedFieldIndex`, `selectedWavelengthIndex`, `selectedPlotType`

`committedOpticalModel` is read from `lensStore` via `useStore(lensStore, (s) => s.committedOpticalModel)`.

`committedSpecs` is subscribed from `specsStore` via `useStore(specsStore, (s) => s.committedSpecs)` (return value unused — subscription only) to trigger re-renders when the committed specs change.

## Derived Data

- **`fieldOptions`** — obtained by calling `specsStore.getState().getFieldOptions()` directly in the render body (re-evaluated on each render triggered by `committedSpecs` change). Unit is `°` for `"angle"`, ` mm` for `"height"`.
- **`wavelengthOptions`** — obtained by calling `specsStore.getState().getWavelengthOptions()` directly in the render body.

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

- Used in `app/page.tsx`. `page.tsx` creates `analysisPlotStore`, `specsStore`, and `lensStore` and passes them along with `proxy`, `onError`, and `autoHeight`.
