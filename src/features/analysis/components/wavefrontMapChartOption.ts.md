# `features/analysis/components/wavefrontMapChartOption.ts`

## Purpose

Defines the Wavefront Map ECharts configuration used by `WavefrontMapChart`. This module owns ECharts registration, fixed layout constants, value formatting, and conversion from worker-provided wavefront grids into heatmap-series data.

## API

```ts
function buildWavefrontMapOption(
  wavefrontMapData: WavefrontMapData,
  chartWidth: number,
  chartHeight: number,
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
- Keeps the plot area square by deriving `grid.width` and `grid.height` from the available measured space.
- Reuses the shared 11-color analysis heatmap palette.
