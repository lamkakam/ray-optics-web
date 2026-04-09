# `features/analysis/components/diffractionPsfChartOption.ts`

## Purpose

Defines the Diffraction PSF ECharts configuration used by `DiffractionPsfChart`. This module owns ECharts registration, fixed layout constants, intensity formatting, and the conversion from worker-provided diffraction PSF grid data into scatter-series data.

## API

```ts
function formatDiffractionPsfIntensity(log10Intensity: number): string

function buildDiffractionPsfOption(
  diffractionPsfData: DiffractionPsfData,
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

- Registers the required ECharts scatter, grid, tooltip, visual-map, and canvas renderer modules once at module load.
- Flattens the worker `x`/`y`/`z` grid into scatter points `[x, y, log10(max(z, 5e-4))]`.
- Uses a symmetric axis extent across both axes based on the largest absolute `x` or `y` value.
- Keeps the plot area square by deriving `grid.width` and `grid.height` from the available measured space.
- Reserves right-side layout space for the continuous `visualMap`.
- Pins the `visualMap` top edge to the diffraction plot top so the legend bar aligns vertically with the scatter plot instead of the overall chart frame.
- Formats `visualMap` labels back into linear intensity values using 2 significant figures.
- Caps `visualMap.itemHeight` based on measured chart height so short panels keep the legend inside bounds.
- Uses the fixed 11-color diffraction PSF palette shared by the view.
