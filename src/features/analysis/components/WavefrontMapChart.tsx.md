# `features/analysis/components/WavefrontMapChart.tsx`

## Purpose

Renders the Wavefront Map analysis view as an Apache ECharts canvas heatmap. This component owns DOM measurement, responsive sizing, debounced chart updates, and ECharts instance lifecycle management.

## Props

```ts
interface WavefrontMapChartProps {
  wavefrontMapData: WavefrontMapData;
  autoHeight?: boolean;
}
```

## Key Behaviors

- Measures its parent container with `ResizeObserver`.
- Uses the parent width as the chart width.
- Uses a square chart height in `autoHeight` mode; otherwise clamps height to `min(parentWidth, parentHeight)` and allows collapse to `0px`.
- Builds chart options through `buildWavefrontMapOption(...)`.
- Debounces `echarts.init(...)/setOption(...)/resize()` by 500ms.
- Reuses a single ECharts instance until unmount, then disposes it and clears the ref.
- Resizes the existing chart instance on window resize events.
