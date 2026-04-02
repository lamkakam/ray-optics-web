# `features/analysis/components/AnalysisPlotContainer.tsx`

## Purpose

Container component that owns all analysis-plot logic: derives field/wavelength select options, maps plot types to worker API calls, and handles user-driven field, wavelength, and plot-type changes. Renders `AnalysisPlotView` as its presentational child.

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
| `proxy` | `PyodideWorkerAPI \| undefined` | Yes | Pyodide worker proxy; handlers no-op if `undefined` |`getWavelengthOptions()` are called to derive select options |
| `onError` | `() => void` | Yes | Called when any async plot call throws |
| `autoHeight` | `boolean` | No | Forwarded to `AnalysisPlotView` |

## State

All five analysis-plot state fields (reactive) are read from `useAnalysisPlotStore` and Zustand's `useStore(store, selector)`:
- `plotImage`, `plotLoading`, `selectedFieldIndex`, `selectedWavelengthIndex`, `selectedPlotType`.

`committedOpticalModel` is read from `lensStore` via `useLensEditorStore` and `useStore(lensStore, (s) => s.committedOpticalModel)`.

`committedSpecs` is subscribed from `specsStore` via `useSpecsConfiguratorStore` and `useStore(specsStore, (s) => s.committedSpecs)` (return value unused — subscription only) to trigger re-renders when the committed specs change.

## Derived Data

- **`fieldOptions`** — obtained by calling `specsStore.getState().getFieldOptions()` directly in the render body (re-evaluated on each render triggered by `committedSpecs` change). Unit is `°` for `"angle"`, ` mm` for `"height"`.
- **`wavelengthOptions`** — obtained by calling `specsStore.getState().getWavelengthOptions()` directly in the render body.

## Internal Logic

Plot functions are obtained via `buildPlotFn(plotType, proxy, committedOpticalModel)` from `@/shared/lib/utils/plotFunctions`. This returns a `(fieldIndex, wavelengthIndex) => Promise<string>` function, or `undefined` when `proxy` or `committedOpticalModel` is missing.

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
