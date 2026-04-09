# `features/analysis/components/RayFanChart.tsx`

## Purpose

Renders the Ray Fan analysis plot with Apache ECharts using worker-provided `RayFanData`. The component mirrors `OpdFanChart`: it measures the parent container, debounces chart updates, and delegates all series/layout construction to `rayFanChartOption.ts`.

## Props

```ts
interface RayFanChartProps {
  rayFanData: RayFanData;
  wavelengthLabels: readonly string[];
  autoHeight?: boolean;
}
```

## Key Behaviors

- Initializes an ECharts canvas instance lazily and reuses it until unmount.
- Debounces `setOption(...)/resize()` by 500ms.
- Uses parent dimensions via `ResizeObserver`; in `autoHeight` mode the chart height is `max(round(width / 2), 320)`.
- Disposes the ECharts instance on unmount.
- Exposes `data-testid="ray-fan-chart"` and `aria-label="Ray fan plot"`.

## Dependencies

- `echarts/core`
- `buildRayFanChartOption` from `./rayFanChartOption`
- `RayFanData` from `@/shared/lib/types/opticalModel`
