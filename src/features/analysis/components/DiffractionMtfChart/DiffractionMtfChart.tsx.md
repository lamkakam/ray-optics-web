# `features/analysis/components/DiffractionMtfChart/DiffractionMtfChart.tsx`

## Purpose

Typed React wrapper for the Diffraction MTF ECharts line plot.

## Props

```ts
interface DiffractionMtfChartProps {
  diffractionMtfData: DiffractionMtfData;
  autoHeight?: boolean;
}
```

## Behavior

- Uses `createAnalysisChartComponent` for measurement, theme-aware text color, debounced ECharts updates, and disposal.
- Renders into a `div` with `data-testid="diffraction-mtf-chart"` and `aria-label="Diffraction MTF plot"`.
- Uses `buildDiffractionMtfOption(...)` to build chart options from measured dimensions.
- In fixed-height mode, chart height is capped by the parent height and otherwise targets 60% of chart width with a 300 px minimum.
