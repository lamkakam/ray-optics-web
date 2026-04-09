# `features/analysis/stores/analysisPlotStore.ts`

## Purpose

Zustand store for managing the analysis plot panel state. Holds the current plot image, wavefront-map data, or diffraction-PSF data payload, plus the loading flag and selected field/wavelength indices that drive the `AnalysisPlotView` component.

## Exports

- `AnalysisPlotState` — interface describing all state fields and actions.
- `createAnalysisPlotSlice` — `StateCreator<AnalysisPlotState>` for composition into the provider-backed store.

## State

| Field | Type | Default |
|---|---|---|
| `plotImage` | `string \| undefined` | `undefined` |
| `diffractionPsfData` | `DiffractionPsfData \| undefined` | `undefined` |
| `wavefrontMapData` | `WavefrontMapData \| undefined` | `undefined` |
| `plotLoading` | `boolean` | `false` |
| `selectedFieldIndex` | `number` | `0` |
| `selectedWavelengthIndex` | `number` | `0` |
| `selectedPlotType` | `PlotType` | `"rayFan"` |

## Actions

- `setPlotImage(image)` — sets or clears the base64 PNG plot image and clears `diffractionPsfData` plus `wavefrontMapData`.
- `setDiffractionPsfData(data)` — sets or clears the diffraction PSF chart payload and clears `plotImage` plus `wavefrontMapData`.
- `setWavefrontMapData(data)` — sets or clears the wavefront-map chart payload and clears `plotImage` plus `diffractionPsfData`.
- `setPlotLoading(loading)` — sets the loading flag.
- `setSelectedFieldIndex(index, maxCount?)` — sets the active field index. If `maxCount` is provided, clamps the index to `maxCount - 1`.
- `setSelectedWavelengthIndex(index, maxCount?)` — sets the active wavelength index. If `maxCount` is provided, clamps the index to `maxCount - 1`.
- `setSelectedPlotType(plotType)` — sets the active plot type.

## Dependencies

- `create`, `StateCreator` from `zustand`.
- `PlotType` (type-only) from `@/features/analysis/components/AnalysisPlotView`.
- `DiffractionPsfData` and `WavefrontMapData` (type-only) from `@/shared/lib/types/opticalModel`.
