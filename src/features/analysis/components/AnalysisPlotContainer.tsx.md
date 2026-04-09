# `features/analysis/components/AnalysisPlotContainer.tsx`

## Purpose

Container component that owns all analysis-plot logic: derives field/wavelength select options, resolves the correct worker API for each plot type, and handles user-driven field, wavelength, and plot-type changes. Renders `AnalysisPlotView` as its presentational child and feeds either a base64 image, typed surface-by-surface Seidel data, typed Ray-Fan data, typed OPD-fan data, typed spot-diagram point data, typed geometric-PSF point data, typed wavefront-map grid data, or typed diffraction-PSF grid data depending on the selected plot type.

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

All analysis-plot state fields (reactive) are read from `useAnalysisPlotStore` and Zustand's `useStore(store, selector)`:
- `plotImage`, `rayFanData`, `opdFanData`, `spotDiagramData`, `geoPsfData`, `wavefrontMapData`, `diffractionPsfData`, `plotLoading`, `selectedFieldIndex`, `selectedWavelengthIndex`, `selectedPlotType`.

`committedOpticalModel` is read from `lensStore` via `useLensEditorStore` and `useStore(lensStore, (s) => s.committedOpticalModel)`.

`seidelData` is read reactively from `useAnalysisDataStore()` and passed through to the view for `surfaceBySurface3rdOrder`.

`committedSpecs` is subscribed from `specsStore` via `useSpecsConfiguratorStore` and `useStore(specsStore, (s) => s.committedSpecs)` (return value unused — subscription only) to trigger re-renders when the committed specs change.

## Derived Data

- **`fieldOptions`** — obtained by calling `specsStore.getState().getFieldOptions()` directly in the render body (re-evaluated on each render triggered by `committedSpecs` change). Unit is `°` for `"angle"`, ` mm` for `"height"`.
- **`wavelengthOptions`** — obtained by calling `specsStore.getState().getWavelengthOptions()` directly in the render body.

## Internal Logic

All plot loading goes through `loadAnalysisPlot(...)` from `@/shared/lib/utils/plotFunctions`, which centralizes the plot-type to worker-API mapping. This keeps the panel behavior aligned with `LensEditor.tsx` submit handling.

### `loadPlot(plotType, fieldIndex, wavelengthIndex)`

Shared async helper used by all three change handlers:

1. Returns immediately when `proxy` or `committedOpticalModel` is missing.
2. Sets `plotLoading(true)`.
3. Calls `loadAnalysisPlot({ plotType, proxy, model: committedOpticalModel, fieldIndex, wavelengthIndex })`.
4. If the result kind is `"diffractionPSF"`, stores the payload with `setDiffractionPsfData(...)`.
5. If the result kind is `"rayFan"`, stores the payload with `setRayFanData(...)`.
6. If the result kind is `"opdFan"`, stores the payload with `setOpdFanData(...)`.
7. If the result kind is `"spotDiagram"`, stores the payload with `setSpotDiagramData(...)`.
8. If the result kind is `"geoPSF"`, stores the payload with `setGeoPsfData(...)`.
9. If the result kind is `"wavefrontMap"`, stores the payload with `setWavefrontMapData(...)`.
10. If the result kind is `"surfaceBySurface3rdOrder"`, updates only `analysisDataStore.seidelData.surfaceBySurface`.
11. If the result kind is `"image"`, stores the base64 PNG with `setPlotImage(...)`.
12. Calls `onError()` in `catch` and always clears `plotLoading` in `finally`.

### `handleFieldChange(value)`

1. Updates `selectedFieldIndex` in store.
2. If `proxy` is undefined or `PLOT_TYPE_CONFIG[selectedPlotType].fieldDependent === false`, returns without plotting.
3. Delegates to `loadPlot(selectedPlotType, value, selectedWavelengthIndex)`.

### `handleWavelengthChange(value)`

Same pattern as `handleFieldChange` but updates `selectedWavelengthIndex` and delegates to `loadPlot(selectedPlotType, selectedFieldIndex, value)`. Only executes the plot call when `fieldDependent === true` (all wavelength-dependent plot types are also field-dependent).

### `handlePlotTypeChange(plotType)`

1. Updates `selectedPlotType` in store.
2. If `proxy` is undefined, returns.
3. Returns immediately for `surfaceBySurface3rdOrder`; the view reuses already-fetched `seidelData.surfaceBySurface` and does not refetch or use the legacy PNG path.
4. Delegates to `loadPlot(plotType, selectedFieldIndex, selectedWavelengthIndex)` for the remaining plot types.

## Usages

- Used in `LensEditor.tsx`. The container pulls the relevant stores from their providers and only receives `proxy`, `onError`, and `autoHeight` as props.
