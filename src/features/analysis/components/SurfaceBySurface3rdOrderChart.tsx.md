# `features/analysis/components/SurfaceBySurface3rdOrderChart.tsx`

## Purpose

Dedicated ECharts renderer for the analysis panel’s surface-by-surface third-order Seidel aberration view. Consumes `SeidelSurfaceBySurfaceData` and renders a grouped bar chart using the default ECharts series palette.

## Props

```ts
interface SurfaceBySurface3rdOrderChartProps {
  surfaceBySurface3rdOrderData: SeidelSurfaceBySurfaceData;
  autoHeight?: boolean;
}
```

## Key Behaviors

- Uses `buildSurfaceBySurface3rdOrderChartOption(...)` to translate Seidel surface data into a grouped bar chart.
- Reads the active app theme via `useTheme()` and passes a resolved light/dark chart text color into `buildSurfaceBySurface3rdOrderChartOption(...)`.
- Preserves the existing analysis-chart sizing pattern:
  - measures the parent with `ResizeObserver`
  - initializes ECharts lazily
  - debounces `setOption(...)`
  - disposes the chart on unmount
- `autoHeight` uses a responsive width-based chart height; otherwise the chart fills the available parent height.
- Exposes `data-testid="surface-by-surface-3rd-order-chart"` for tests.

## Data Shape

- `surfaceBySurface3rdOrderData.aberrTypes` provides the five legend/series names.
- `surfaceBySurface3rdOrderData.surfaceLabels` provides the x-axis categories.
- `surfaceBySurface3rdOrderData.data[rowIdx]` provides one bar series per Seidel aberration type.
