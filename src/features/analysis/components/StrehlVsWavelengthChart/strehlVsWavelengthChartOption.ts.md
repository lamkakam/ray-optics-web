# `features/analysis/components/StrehlVsWavelengthChart/strehlVsWavelengthChartOption.ts`

## Purpose

Builds the Apache ECharts option for the Strehl vs Wavelength line chart.

## Exports

- `buildStrehlVsWavelengthOption(strehlVsWavelengthData, chartWidth, chartHeight, textColor)` - returns a line-chart option for Strehl ratio samples across wavelength.

## Series

- `Strehl` - one `line` series using paired `[x, y]` samples and `showSymbol: false`.

## Axes

- X axis is `Wavelength` and appends `(${unitX})` when `unitX` is non-empty.
- X axis `min` and `max` are pinned to the first and last sampled wavelengths so ECharts does not add value-axis padding.
- Y axis is `Strehl Ratio` with fixed range `[0, 1]`.
- Tick labels use `formatPlotValue`.
