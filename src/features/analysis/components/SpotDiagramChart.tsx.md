# `features/analysis/components/SpotDiagramChart.tsx`

## Purpose

Renders the Spot Diagram analysis view as an Apache ECharts multi-series scatter plot. This component owns DOM measurement, responsive sizing, debounced chart updates, and ECharts instance lifecycle management.

## Props

```ts
interface SpotDiagramChartProps {
  spotDiagramData: SpotDiagramData;
  wavelengthLabels: readonly string[];
  autoHeight?: boolean;
}
```

## Key Behaviors

- Measures its parent container with `ResizeObserver`.
- Uses the parent width as the chart width.
- Uses a square chart height in `autoHeight` mode; otherwise clamps height to `min(parentWidth, parentHeight)`.
- Builds chart options through `buildSpotDiagramOption(...)`.
- Reads the active app theme via `useTheme()` and passes a resolved light/dark chart text color into `buildSpotDiagramOption(...)`.
- Debounces `echarts.init(...)/setOption(...)/resize()` by 500ms.
- Reuses a single ECharts instance until unmount, then disposes it and clears the ref.
- Resizes the existing chart instance on window resize events.
