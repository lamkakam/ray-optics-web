# `features/analysis/components/AstigmatismChart/astigmatismChartOption.ts`

## Purpose

Builds the ECharts option for wavelength-specific astigmatism focal-separation curves.

## Behavior

- Registers line, grid, tooltip, and canvas renderer modules.
- Does not register `LegendComponent`.
- Does not emit a `legend` option.
- Produces exactly one `grid`, one value `xAxis`, and one category `yAxis`.
- Reuses the shared focus-shift x-axis, field-category y-axis, grid, split-line, and visible field-category tick behavior.
- Produces exactly one symbol-free line series named `Astigmatism`.
- Enables a crosshair axis pointer through the tooltip configuration.
