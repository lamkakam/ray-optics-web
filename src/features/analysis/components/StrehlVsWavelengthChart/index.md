# `features/analysis/components/StrehlVsWavelengthChart/`

## Purpose

Contains the ECharts implementation for the Strehl vs Wavelength analysis plot.

## Files

- `StrehlVsWavelengthChart.tsx` - React chart component built through `createAnalysisChartComponent`.
- `strehlVsWavelengthChartOption.ts` - ECharts line-series option builder.
- `index.ts` - public exports for the chart component and option builder.

## Behavior

The chart renders one symbol-free line series named `Strehl`, pairing wavelength samples from `x` with Strehl ratio samples from `y`.
