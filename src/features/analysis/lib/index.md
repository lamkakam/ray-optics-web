# `features/analysis/lib/`

Analysis utility modules shared by analysis feature entry points and chart components.

## Files

- [plotFunctions.ts](./plotFunctions.ts) — Functions for loading optical analysis plot data
- [analysisChartPalette/](./analysisChartPalette/analysisChartPalette.ts) — Shared 11-color palette used by analysis heatmap-style ECharts views
- [createAnalysisChartComponent/](./createAnalysisChartComponent/createAnalysisChartComponent.tsx) — Higher-order factory that returns analysis chart function components with shared ECharts lifecycle handling
