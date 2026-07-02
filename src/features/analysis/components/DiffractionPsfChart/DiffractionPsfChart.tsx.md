# `features/analysis/components/DiffractionPsfChart/DiffractionPsfChart.tsx`

## Purpose

Renders the Diffraction PSF analysis view as a deck.gl `GridLayer` inside an `OrthographicView`, with SVG chart chrome for axes, ticks, labels, and the normalized-flux color bar.

## Props

```ts
interface DiffractionPsfChartProps {
  diffractionPsfData: DiffractionPsfData;
  autoHeight?: boolean;
}
```

## Key Behaviors

- Measures its parent with the shared cartesian deck plot helper.
- Uses the parent width as the chart width.
- Applies a sizing policy where `autoHeight` uses a square chart and fixed-height mode clamps to `min(parentWidth, parentHeight)` while allowing collapse to `0px`.
- Converts `DiffractionPsfData` to deck.gl bin records through `buildDiffractionPsfBins(...)`.
- Uses `GridLayer` with Cartesian coordinates, `gpuAggregation: true`, `colorAggregation: "SUM"`, physical `cellSize`, physical `getPosition`, and log-scaled normalized-flux `getColorWeight`.
- Uses `OrthographicView({ id: "diffraction-psf-view", flipY: false, controller: true })`.
- Stores controlled deck.gl view state keyed by the orthographic view id.
- Resets the controlled view state to `target: [0, 0, 0]` when the PSF extent or plot side changes.
- Computes initial zoom as `log2(plotSide / (2 * axisExtent * 1.12))` so the full symmetric PSF extent fits in the square viewport.
- Draws x-axis, y-axis, tick labels, axis labels, and a vertical color bar through the shared SVG overlay aligned to the deck.gl viewport.
- Computes SVG x/y tick labels from the currently controlled orthographic viewport, so pan and zoom keep the axes on the plot frame while labels reflect the visible physical coordinate range.
- Positions the y-axis label relative to the centered plot viewport (`plotLeft - 54`) so it stays adjacent to the plotted y-axis when the chart container is wider than the square plot.
- Uses `currentColor` for SVG strokes and text fills so axis chrome, tick labels, axis labels, and color-bar labels inherit the chart container's theme-aware text color.
- Labels the color bar in normalized flux per physical bin, with the lower label coming from the shared `DIFFRACTION_PSF_LOG_FLOOR` (`5e-4`).
- Passes the shared `DIFFRACTION_PSF_LOG_FLOOR` as the lower deck.gl `GridLayer.colorDomain` value so grid weights and color-bar labels use the same normalized-flux floor.
- Keeps `data-testid="diffraction-psf-chart"` and `aria-label="Diffraction PSF plot"`.

## Axis Tick Calculation Flow

- `buildDiffractionPsfBins(...)` derives `axisExtent` from the maximum absolute physical coordinate across `diffractionPsfData.x` and `diffractionPsfData.y`, falling back to `1` when no positive extent is available.
- The initial controlled orthographic view state uses `target: [0, 0, 0]` and `zoom = log2(plotSide / (2 * axisExtent * 1.12))`, so the full symmetric prepared extent fits inside the square plot with padding.
- The visible physical domains are derived from the controlled view state: `scale = 2 ** zoom`, `visibleHalfRange = plotSide / (2 * scale)`, x uses `target[0] +/- visibleHalfRange`, and y uses `target[1] +/- visibleHalfRange`.
- `TICK_COUNT = 5`; each tick value is linearly interpolated from the visible domain minimum to maximum.
- X ticks render left-to-right in domain order.
- Y ticks render bottom-to-top in value order. The SVG offset is inverted from the interpolation index so larger y values appear higher on screen.
- Tick labels are formatted with `formatPlotValue(...)`.
- Pan and zoom updates replace the controlled view state, so tick labels follow the currently visible physical coordinate range rather than fixed raw PSF array indices.

## Dependencies

- `DiffractionPsfData` from `features/analysis/types/plotData`
- `DeckGL`, `GridLayer`, and `OrthographicView` from `deck.gl`
- Shared layout, view-state, tick, palette, and SVG overlay helpers from `cartesianPlotDeckHelpers.tsx`
- `buildDiffractionPsfBins(...)` and `formatDiffractionPsfFluxLabel(...)` from `diffractionPsfDeckData.ts`
- `ANALYSIS_HEATMAP_COLOR_PALETTE` from `features/analysis/lib/analysisChartPalette`
