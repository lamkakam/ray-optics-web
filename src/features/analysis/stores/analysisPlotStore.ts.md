# `features/analysis/stores/analysisPlotStore.ts`

## Purpose

Zustand store for managing the analysis plot panel state. Holds Ray-Fan data, OPD-fan data, spot-diagram data, geometric-PSF data, wavefront-map data, diffraction-PSF data, or diffraction-MTF data payload, plus the loading flag and selected field/wavelength indices that drive the `AnalysisPlotView` component.

## Exports

- `AnalysisPlotState` — interface describing all state fields and actions.
- `createAnalysisPlotSlice` — `StateCreator<AnalysisPlotState>` for composition into the provider-backed store.

## State

| Field | Type | Default |
|---|---|---|
| `rayFanData` | `RayFanData \| undefined` | `undefined` |
| `opdFanData` | `OpdFanData \| undefined` | `undefined` |
| `spotDiagramData` | `SpotDiagramData \| undefined` | `undefined` |
| `geoPsfData` | `GeoPsfData \| undefined` | `undefined` |
| `diffractionPsfData` | `DiffractionPsfData \| undefined` | `undefined` |
| `diffractionMtfData` | `DiffractionMtfData \| undefined` | `undefined` |
| `wavefrontMapData` | `WavefrontMapData \| undefined` | `undefined` |
| `plotLoading` | `boolean` | `false` |
| `selectedFieldIndex` | `number` | `0` |
| `selectedWavelengthIndex` | `number` | `0` |
| `selectedPlotType` | `PlotType` | `"rayFan"` |

## Actions

- `setRayFanData(data)` — sets or clears the Ray Fan ECharts payload and clears the other typed plot payloads.
- `setOpdFanData(data)` — sets or clears the OPD Fan ECharts payload and clears the other typed plot payloads.
- `setSpotDiagramData(data)` — sets or clears the ECharts Spot Diagram payload and clears the other typed plot payloads.
- `setGeoPsfData(data)` — sets or clears the geometric PSF chart payload and clears the other typed plot payloads.
- `setDiffractionPsfData(data)` — sets or clears the diffraction PSF chart payload and clears the other typed plot payloads.
- `setDiffractionMtfData(data)` — sets or clears the diffraction MTF chart payload and clears the other typed plot payloads.
- `setWavefrontMapData(data)` — sets or clears the wavefront-map chart payload and clears the other typed plot payloads.
- `setPlotLoading(loading)` — sets the loading flag.
- `setSelectedFieldIndex(index, maxCount?)` — sets the active field index. If `maxCount` is provided, clamps the index to `maxCount - 1`.
- `setSelectedWavelengthIndex(index, maxCount?)` — sets the active wavelength index. If `maxCount` is provided, clamps the index to `maxCount - 1`.
- `setSelectedPlotType(plotType)` — sets the active plot type.

## Dependencies

- `create`, `StateCreator` from `zustand`.
- `PlotType` (type-only) from `@/features/analysis/components`.
- `RayFanData`, `OpdFanData`, `SpotDiagramData`, `GeoPsfData`, `DiffractionPsfData`, `DiffractionMtfData`, and `WavefrontMapData` (type-only) from `@/features/analysis/types/plotData`.
