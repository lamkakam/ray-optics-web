# `features/analysis/components/opdFanChartOption.ts`

## Purpose

Defines the OPD Fan ECharts configuration used by `OpdFanChart`. This module owns ECharts registration, fixed layout constants, wavelength-based color assignment, and conversion from worker-provided OPD fan data into paired tangential/sagittal line series.

## Exports

```ts
function buildOpdFanChartOption(
  opdFanData: OpdFanData,
  wavelengthLabels: readonly string[],
  chartWidth: number,
  chartHeight: number,
)
```

## Key Behaviors

- Registers the required ECharts line, grid, legend, title, tooltip, and canvas renderer modules once at module load.
- Produces two grids with titles `Tangential` and `Sagittal`.
- Uses one shared legend entry per wavelength; both subplot series for a wavelength share the same label and color.
- Sets `tooltip.trigger` to `"none"` and `tooltip.axisPointer.type` to `"cross"`.
- Sets `showSymbol: false` on every line series.
- Parses numeric wavelengths from UI labels so lower/higher wavelengths map consistently onto `ANALYSIS_HEATMAP_COLOR_PALETTE`.
- Falls back to stable palette ordering when a wavelength label is not numeric.
- Rounds computed x- and y-axis min/max extents to 2 significant figures before assigning them to both subplots.

## Output Shape

- `title`: two subplot titles
- `grid`: two plotting regions
- `xAxis`: paired `value` axes labeled `Pupil Radius (Relative)`
- `yAxis`: paired `value` axes labeled with the worker `unitY`
- `series`: two line series per wavelength, tangential first then sagittal
