# `features/analysis/components/ray-fan-chart/rayFanChartOption.ts`

## Purpose

Defines the Ray Fan ECharts configuration used by `RayFanChart`. This module owns ECharts registration, fixed layout constants, wavelength-based color assignment, and conversion from worker-provided ray-fan data into paired tangential/sagittal line series.

## Exports

```ts
function buildRayFanChartOption(
  rayFanData: RayFanData,
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
- Sets `tooltip.trigger` to `"none"` and `tooltip.axisPointer.type` to `"cross"`.
- Sets `showSymbol: false` on every line series.
- Parses numeric wavelengths from UI labels so lower/higher wavelengths map consistently onto `ANALYSIS_HEATMAP_COLOR_PALETTE`.
- Falls back to stable palette ordering when a wavelength label is not numeric.
- Rounds computed x- and y-axis min/max extents with the shared analysis plot-value formatter before assigning them to both subplots, including clamping magnitudes smaller than `1e-7` to `0`.
- Labels only the first y-axis with `Transverse Aberr. (${unitY})`; the second subplot omits the duplicate y-axis label.

## Output Shape

- `title`: two subplot titles
- `grid`: two plotting regions
- `xAxis`: paired `value` axes labeled `Pupil Radius (Relative)`
- `yAxis`: paired `value` axes, with the first labeled `Transverse Aberr. (...)` and the second left unlabeled
- `series`: two line series per wavelength, tangential first then sagittal
