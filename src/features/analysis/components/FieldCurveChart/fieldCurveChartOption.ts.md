# `features/analysis/components/FieldCurveChart/fieldCurveChartOption.ts`

## Purpose

Builds the ECharts option for field-curvature value-versus-field category plots.

## Behavior

- Registers line, grid, legend, tooltip, and canvas renderer modules.
- Produces exactly one `grid`, one value `xAxis`, and one category `yAxis`.
- Reuses the shared focus-shift x-axis, field-category y-axis, grid, split-line, and visible field-category tick behavior.
- Produces exactly two symbol-free line series: `Sagittal` and `Tangential`.
- Includes the ECharts legend option for the two field-curvature series.
- Enables an axis pointer through the tooltip configuration.
