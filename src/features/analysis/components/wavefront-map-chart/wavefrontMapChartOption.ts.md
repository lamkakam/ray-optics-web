# `features/analysis/components/wavefront-map-chart/wavefrontMapChartOption.ts`

## Purpose

Defines the Wavefront Map ECharts configuration used by `WavefrontMapChart`. This module owns ECharts registration, fixed layout constants, value formatting, and conversion from worker-provided wavefront grids into heatmap-series data.

## API

```ts
function buildWavefrontMapOption(
  wavefrontMapData: WavefrontMapData,
  chartWidth: number,
  chartHeight: number,
  textColor: string,
): {
  animation: false;
  tooltip: object;
  grid: object;
  xAxis: object;
  yAxis: object;
  visualMap: object;
  series: object[];
}
```

## Key Behaviors

- Registers the required ECharts heatmap, grid, tooltip, visual-map, and canvas renderer modules once at module load.
- Flattens the worker `x`/`y`/`z` grid into heatmap cells `[xIndex, yIndex, z]`.
- Skips `undefined` wavefront cells so missing OPD samples remain blank in the chart.
- Uses a linear `visualMap` scale directly from the worker values; it does not log-transform the wavefront data.
- Formats both x- and y-axis tick labels to 2 significant figures.
- Formats tooltip wavefront values and `visualMap` tick labels to 2 significant figures.
- Applies the caller-provided `textColor` to axis names, axis tick labels, and `visualMap` text so chart chrome follows the active light/dark theme.
- Shows explicit `visualMap` endpoint labels as highest/lowest values in `waves`.
- Enables a crosshair `axisPointer` in the tooltip and formats the x/y pointer labels to 2 significant figures.
- Keeps the plot area square by deriving `grid.width` and `grid.height` from the available measured space.
- Reuses the shared 11-color analysis heatmap palette.
