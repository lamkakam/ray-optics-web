# `features/analysis/stores/analysisPlotStore.ts`

## Purpose

Zustand store for managing the analysis plot panel state. Holds the current plot image, Ray-Fan data, OPD-fan data, geometric-PSF data, wavefront-map data, or diffraction-PSF data payload, plus the loading flag and selected field/wavelength indices that drive the `AnalysisPlotView` component.

## Exports

- `AnalysisPlotState` — interface describing all state fields and actions.
- `createAnalysisPlotSlice` — `StateCreator<AnalysisPlotState>` for composition into the provider-backed store.

## State

| Field | Type | Default |
|---|---|---|
| `plotImage` | `string \| undefined` | `undefined` |
| `rayFanData` | `RayFanData \| undefined` | `undefined` |
| `opdFanData` | `OpdFanData \| undefined` | `undefined` |
| `spotDiagramData` | `SpotDiagramData \| undefined` | `undefined` |
| `geoPsfData` | `GeoPsfData \| undefined` | `undefined` |
| `diffractionPsfData` | `DiffractionPsfData \| undefined` | `undefined` |
| `wavefrontMapData` | `WavefrontMapData \| undefined` | `undefined` |
| `plotLoading` | `boolean` | `false` |
| `selectedFieldIndex` | `number` | `0` |
| `selectedWavelengthIndex` | `number` | `0` |
| `selectedPlotType` | `PlotType` | `"rayFan"` |

## Actions

- `setPlotImage(image)` — sets or clears the base64 PNG plot image and clears all typed chart payloads.
- `setRayFanData(data)` — sets or clears the Ray Fan ECharts payload and clears `plotImage`, `opdFanData`, `spotDiagramData`, `geoPsfData`, `diffractionPsfData`, and `wavefrontMapData`.
- `setOpdFanData(data)` — sets or clears the OPD Fan ECharts payload and clears `plotImage`, `spotDiagramData`, `geoPsfData`, `diffractionPsfData`, and `wavefrontMapData`.
- `setSpotDiagramData(data)` — sets or clears the ECharts Spot Diagram payload and clears `plotImage`, `opdFanData`, `geoPsfData`, `diffractionPsfData`, and `wavefrontMapData`.
- `setGeoPsfData(data)` — sets or clears the geometric PSF chart payload and clears `plotImage`, `opdFanData`, `diffractionPsfData`, and `wavefrontMapData`.
- `setDiffractionPsfData(data)` — sets or clears the diffraction PSF chart payload and clears `plotImage`, `opdFanData`, and `wavefrontMapData`.
- `setWavefrontMapData(data)` — sets or clears the wavefront-map chart payload and clears `plotImage`, `opdFanData`, and `diffractionPsfData`.
- `setPlotLoading(loading)` — sets the loading flag.
- `setSelectedFieldIndex(index, maxCount?)` — sets the active field index. If `maxCount` is provided, clamps the index to `maxCount - 1`.
- `setSelectedWavelengthIndex(index, maxCount?)` — sets the active wavelength index. If `maxCount` is provided, clamps the index to `maxCount - 1`.
- `setSelectedPlotType(plotType)` — sets the active plot type.

## Dependencies

- `create`, `StateCreator` from `zustand`.
- `PlotType` (type-only) from `@/features/analysis/components/AnalysisPlotView`.
- `RayFanData`, `OpdFanData`, `SpotDiagramData`, `GeoPsfData`, `DiffractionPsfData`, and `WavefrontMapData` (type-only) from `@/shared/lib/types/opticalModel`.
