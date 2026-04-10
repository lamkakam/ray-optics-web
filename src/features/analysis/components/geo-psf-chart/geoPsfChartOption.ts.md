# `features/analysis/components/geo-psf-chart/geoPsfChartOption.ts`

## Purpose

Defines the Geometric PSF ECharts configuration used by `GeoPsfChart`. This module owns ECharts registration, fixed layout constants, and conversion from worker-provided geometric PSF point data into scatter-series data.

## API

```ts
function buildGeoPsfOption(
  geoPsfData: GeoPsfData,
  chartWidth: number,
  chartHeight: number,
  textColor: string,
): {
  animation: false;
  tooltip: object;
  grid: object;
  xAxis: object;
  yAxis: object;
  series: object[];
}
```

## Key Behaviors

- Registers the required ECharts scatter, grid, tooltip, and canvas renderer modules once at module load.
- Pairs worker `x` and `y` arrays into scatter points `[x, y]`.
- Uses a symmetric axis extent across both axes based on the largest absolute `x` or `y` value.
- Applies the caller-provided `textColor` to axis names and axis tick labels so chart chrome follows the active light/dark theme.
- Keeps the plot area square by deriving `grid.width` and `grid.height` from the available measured space.
- Does not include a `visualMap`.
- Sets `tooltip.trigger` to `"none"` and `axisPointer.type` to `"cross"`.
- Uses a fixed point color (`#5470c6`), opacity, and minimum visible symbol size (`1`) rather than data-driven coloring.
