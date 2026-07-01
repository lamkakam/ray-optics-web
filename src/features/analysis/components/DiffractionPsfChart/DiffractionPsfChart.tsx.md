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

- Measures its parent with `ResizeObserver`.
- Uses the parent width as the chart width.
- Applies a sizing policy where `autoHeight` uses a square chart and fixed-height mode clamps to `min(parentWidth, parentHeight)` while allowing collapse to `0px`.
- Converts `DiffractionPsfData` to deck.gl bin records through `buildDiffractionPsfBins(...)`.
- Uses `GridLayer` with Cartesian coordinates, `gpuAggregation: true`, `colorAggregation: "SUM"`, physical `cellSize`, physical `getPosition`, and log-scaled normalized-flux `getColorWeight`.
- Uses `OrthographicView({ id: "diffraction-psf-view", flipY: false, controller: true })`.
- Stores controlled deck.gl view state keyed by the orthographic view id.
- Resets the controlled view state to `target: [0, 0, 0]` when the PSF extent or plot side changes.
- Computes initial zoom as `log2(plotSide / (2 * axisExtent * 1.12))` so the full symmetric PSF extent fits in the square viewport.
- Draws x-axis, y-axis, tick labels, axis labels, and a vertical color bar as an SVG overlay aligned to the deck.gl viewport.
- Labels the color bar in normalized flux per physical bin.
- Keeps `data-testid="diffraction-psf-chart"` and `aria-label="Diffraction PSF plot"`.

## Dependencies

- `DiffractionPsfData` from `features/analysis/types/plotData`
- `DeckGL`, `GridLayer`, and `OrthographicView` from `deck.gl`
- `buildDiffractionPsfBins(...)` and `formatDiffractionPsfFluxLabel(...)` from `diffractionPsfDeckData.ts`
- `ANALYSIS_HEATMAP_COLOR_PALETTE` from `features/analysis/lib/analysisChartPalette`
