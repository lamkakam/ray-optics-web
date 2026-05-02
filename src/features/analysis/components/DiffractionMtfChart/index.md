# `features/analysis/components/DiffractionMtfChart/`

## Purpose

Contains the ECharts implementation for the Diffraction MTF analysis plot.

## Files

- `DiffractionMtfChart.tsx` — React chart component built through `createAnalysisChartComponent`.
- `diffractionMtfChartOption.ts` — ECharts line-series option builder.
- `index.ts` — public exports for the chart component and option builder.

## Behavior

The chart renders measured tangential/sagittal MTF curves and ideal tangential/sagittal curves. Measured curves use solid lines; ideal curves use dashed lines.
