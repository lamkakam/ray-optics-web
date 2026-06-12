# `features/analysis/components/FieldCurveChart/fieldCurveChartOption.ts`

## Purpose

Builds the ECharts option for field-curve style value-versus-field category plots.

## Behavior

- Registers line, grid, legend, tooltip, and canvas renderer modules.
- Produces exactly one `grid`, one value `xAxis`, and one category `yAxis`.
- Explicitly shows solid grey split lines on both axes so field curvature and astigmatism plots render vertical and horizontal grid lines consistently.
- Limits visible y-axis category labels, tick marks, and horizontal split lines to five evenly distributed field labels when more than five labels are available, always including the first and last field labels.
- Shows every y-axis category label, tick mark, and horizontal split line when five or fewer field labels are available.
- Produces symbol-free line series supplied by the caller. Field curvature uses `Sagittal` and `Tangential`; astigmatism uses one `Astigmatism` series.
- Enables an axis pointer through the tooltip configuration.
