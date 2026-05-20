# `features/analysis/components/StrehlVsWavelengthChart/StrehlVsWavelengthChart.tsx`

## Purpose

Typed React wrapper for the Strehl vs Wavelength ECharts line plot.

## Props

```ts
interface StrehlVsWavelengthChartProps {
  strehlVsWavelengthData: StrehlVsWavelengthData;
  autoHeight?: boolean;
}
```

## Behavior

- Uses `createAnalysisChartComponent` for measurement, theme-aware text color, debounced ECharts updates, and disposal.
- Renders into a `div` with `data-testid="strehl-vs-wavelength-chart"` and `aria-label="Strehl vs Wavelength plot"`.
- Uses `buildStrehlVsWavelengthOption(...)` to build chart options from measured dimensions.
- In fixed-height mode, chart height is capped by the parent height and otherwise targets 60% of chart width with a 300 px minimum.
