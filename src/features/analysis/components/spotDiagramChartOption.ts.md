# `features/analysis/components/spotDiagramChartOption.ts`

## Purpose

Defines the Spot Diagram ECharts configuration used by `SpotDiagramChart`. This module owns ECharts registration, fixed layout constants, and conversion from worker-provided per-wavelength point clouds into labeled scatter series.

## API

```ts
function buildSpotDiagramOption(
  spotDiagramData: SpotDiagramData,
  wavelengthLabels: readonly string[],
  chartWidth: number,
  chartHeight: number,
)
```

## Key Behaviors

- Registers the required ECharts scatter, grid, legend, tooltip, and canvas renderer modules once at module load.
- Builds one scatter series per wavelength group in `spotDiagramData`.
- Uses `wavelengthLabels[wvlIdx]` as the series and legend label so the UI shows the actual wavelength value rather than the wavelength index.
- Uses a fixed categorical palette so each wavelength group has a distinct color.
- Uses symmetric axis extents across both axes based on the largest absolute `x` or `y` value across all wavelength groups.
- Keeps the plot area square by deriving `grid.width` and `grid.height` from the available measured space.
- Does not include a `visualMap`.
- Sets `tooltip.trigger` to `"none"` and `axisPointer.type` to `"cross"`.
- Uses the minimum visible point size (`1`) for all series.
