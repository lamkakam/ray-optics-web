# `features/analysis/components/FieldCurveChart/fieldCurveChartOption.ts`

## Purpose

Builds the ECharts option for sagittal/tangential focus shift versus field category plots.

## Behavior

- Registers line, grid, legend, tooltip, and canvas renderer modules.
- Produces exactly one `grid`, one value `xAxis`, and one category `yAxis`.
- Produces exactly two symbol-free line series named `Sagittal` and `Tangential`.
- Enables an axis pointer through the tooltip configuration.
