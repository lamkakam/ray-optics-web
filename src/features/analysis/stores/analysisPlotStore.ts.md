# `features/analysis/stores/analysisPlotStore.ts`

## Purpose

Zustand store for managing the analysis plot panel state. Holds the current plot image, loading flag, selected field/wavelength indices, and selected plot type that drive the `AnalysisPlotView` component.

## Exports

- `AnalysisPlotState` — interface describing all state fields and actions.
- `createAnalysisPlotSlice` — `StateCreator<AnalysisPlotState>` for composition into the provider-backed store.

## State

| Field | Type | Default |
|---|---|---|
| `plotImage` | `string \| undefined` | `undefined` |
| `plotLoading` | `boolean` | `false` |
| `selectedFieldIndex` | `number` | `0` |
| `selectedWavelengthIndex` | `number` | `0` |
| `selectedPlotType` | `PlotType` | `"rayFan"` |

## Actions

- `setPlotImage(image)` — sets or clears the base64 PNG plot image.
- `setPlotLoading(loading)` — sets the loading flag.
- `setSelectedFieldIndex(index, maxCount?)` — sets the active field index. If `maxCount` is provided, clamps the index to `maxCount - 1`.
- `setSelectedWavelengthIndex(index, maxCount?)` — sets the active wavelength index. If `maxCount` is provided, clamps the index to `maxCount - 1`.
- `setSelectedPlotType(plotType)` — sets the active plot type.

## Dependencies

- `create`, `StateCreator` from `zustand`.
- `PlotType` (type-only) from `@/features/analysis/components/AnalysisPlotView`.
