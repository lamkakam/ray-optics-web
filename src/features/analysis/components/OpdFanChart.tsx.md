# `features/analysis/components/OpdFanChart.tsx`

## Purpose

Renders the OPD Fan analysis view as an Apache ECharts canvas chart with two side-by-side subplots: Tangential and Sagittal. The component owns DOM measurement, responsive sizing, debounced chart updates, and ECharts instance lifecycle management.

## Props

```ts
interface OpdFanChartProps {
  opdFanData: OpdFanData;
  wavelengthLabels: readonly string[];
  autoHeight?: boolean;
}
```

## Key Behaviors

- Builds the chart option with `buildOpdFanChartOption(...)`.
- Debounces `echarts.init(...)/setOption(...)/resize()` by 500ms.
- Reuses a single ECharts instance until unmount, then disposes it and clears the ref.
- In `autoHeight` mode, uses a minimum readable height based on width; otherwise fills the parent height.
- Exposes `data-testid="opd-fan-chart"` and `aria-label="OPD fan plot"` for tests and accessibility.

## Dependencies

- `echarts/core`
- `buildOpdFanChartOption` from `./opdFanChartOption`
- `OpdFanData` from `@/shared/lib/types/opticalModel`
