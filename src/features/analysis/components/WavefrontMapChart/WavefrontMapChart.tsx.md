# `features/analysis/components/WavefrontMapChart/WavefrontMapChart.tsx`

## Purpose

Renders the Wavefront Map analysis view as a deck.gl `BitmapLayer` inside an `OrthographicView`, with SVG chart chrome for axes, ticks, labels, and the wavefront color bar.

## Props

```ts
interface WavefrontMapChartProps {
  wavefrontMapData: WavefrontMapData;
  autoHeight?: boolean;
}
```

## Key Behaviors

- Measures its parent with `ResizeObserver`.
- Uses the parent width as the chart width.
- Applies a sizing policy where `autoHeight` uses a square chart and fixed-height mode clamps to `min(parentWidth, parentHeight)` while allowing collapse to `0px`.
- Converts `WavefrontMapData` to raw RGBA bytes through `buildWavefrontMapBitmap(...)`, then wraps those bytes in browser `ImageData` for deck.gl texture upload.
- Uses `BitmapLayer` with Cartesian coordinates and bounds from the physical x/y coordinate extents.
- Uses `OrthographicView({ id: "wavefront-map-view", flipY: false, controller: true })`.
- Stores controlled deck.gl view state keyed by the stable wavefront map view id.
- Resets the controlled view state when the prepared extent or plot side changes.
- Computes initial zoom as `log2(plotSide / (2 * axisExtent * 1.12))` so the full wavefront extent fits in the square viewport.
- Draws x-axis, y-axis, tick labels, axis labels, and a vertical color bar as an SVG overlay aligned to the deck.gl viewport.
- Computes SVG x/y tick labels from the currently controlled orthographic viewport, so pan and zoom keep axes on the frame while labels reflect the visible physical coordinate range.
- Uses `currentColor` for SVG strokes and text fills so chart chrome inherits the chart container's theme-aware text color.
- Labels the color bar with `unitZ` when provided, falling back to `waves`, with endpoint labels from finite min/max wavefront samples.
- Keeps `data-testid="wavefront-map-chart"` and `aria-label="Wavefront Map plot"`.
