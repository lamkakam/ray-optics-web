# `features/analysis/components/OpdFanChart/opdFanChartOption.ts`

## Purpose

Defines the OPD Fan ECharts configuration used by `OpdFanChart`. This module owns ECharts registration, fixed layout constants, wavelength-based color assignment, and conversion from worker-provided OPD fan data into paired tangential/sagittal line series.

## Exports

```ts
function buildOpdFanChartOption(
  opdFanData: OpdFanData,
  wavelengthLabels: readonly string[],
  chartWidth: number,
  chartHeight: number,
  textColor: string,
)
```

## Key Behaviors

- Registers the required ECharts line, grid, legend, title, tooltip, and canvas renderer modules once at module load.
- Produces two grids with titles `Tangential` and `Sagittal`.
- Uses one shared legend entry per wavelength; both subplot series for a wavelength share the same label and color.
- Applies the caller-provided `textColor` to subplot titles, legend labels, axis names, and axis tick labels so chart chrome follows the active light/dark theme.
- Formats y-axis tick labels with the shared analysis plot-value formatter.
- Sets `tooltip.trigger` to `"none"` and `tooltip.axisPointer.type` to `"cross"`.
- Sets `showSymbol: false` on every line series.
- Parses numeric wavelengths from UI labels so lower/higher wavelengths map consistently onto `ANALYSIS_HEATMAP_COLOR_PALETTE`.
- Falls back to stable palette ordering when a wavelength label is not numeric.
- Computes one shared x-axis min/max extent from both subplots and assigns it to both x axes.
- Computes independent y-axis min/max extents for Tangential and Sagittal data, assigns them to their matching subplots, and does not expose a UI toggle for shared y scaling.
- Rounds computed axis min/max extents with the shared analysis plot-value formatter before assigning them to subplots, including clamping magnitudes smaller than `1e-9` to `0`.
- Falls back to `[-1e-6, 1e-6]` for a subplot's y-axis extent when that subplot has no finite y values or only one constant finite y value.
- Labels only the first y-axis with the worker `unitY`; the second subplot omits the duplicate y-axis unit label.

## Output Shape

- `title`: two subplot titles
- `grid`: two plotting regions
- `xAxis`: paired `value` axes labeled `Pupil Radius (Relative)`
- `yAxis`: paired `value` axes, with the first labeled by the worker `unitY` and the second left unlabeled
- `series`: two line series per wavelength, tangential first then sagittal
