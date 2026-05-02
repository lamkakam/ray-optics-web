# `features/analysis/components/DiffractionMtfChart/diffractionMtfChartOption.ts`

## Purpose

Builds the Apache ECharts option for the Diffraction MTF line chart.

## Exports

- `buildDiffractionMtfOption(diffractionMtfData, chartWidth, chartHeight, textColor)` — returns a line-chart option for measured and ideal MTF curves.

## Series

| Series | Source | Line style |
|---|---|---|
| `Tangential` | `diffractionMtfData.Tangential` | solid |
| `Sagittal` | `diffractionMtfData.Sagittal` | solid |
| `IdealTangential` | `diffractionMtfData.IdealTangential` | dashed |
| `IdealSagittal` | `diffractionMtfData.IdealSagittal` | dashed |

## Axes

- X axis is `Spatial Frequency` and appends `(${unitX})` when `unitX` is non-empty.
- Y axis is `MTF`, starts at `0`, and defaults to max `1` unless data contains a value above `1`.
- Tick labels use `formatPlotValue`.
