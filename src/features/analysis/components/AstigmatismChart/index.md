# `features/analysis/components/AstigmatismChart/`

## Purpose

Contains the ECharts implementation for the Astigmatism Curve analysis plot.

## Files

- `AstigmatismChart.tsx` — React chart component built through `createAnalysisChartComponent`.
- `astigmatismChartOption.ts` — ECharts single-line option builder without legend support.
- `index.ts` — public exports for the chart component and option builder.

## Behavior

The chart renders one `Astigmatism` line against field category labels and intentionally omits ECharts legend registration and legend configuration.
