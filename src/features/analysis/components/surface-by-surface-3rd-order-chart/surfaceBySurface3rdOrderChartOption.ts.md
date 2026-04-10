# `features/analysis/components/surface-by-surface-3rd-order-chart/surfaceBySurface3rdOrderChartOption.ts`

## Purpose

Builds the ECharts option object for the analysis panel’s grouped bar chart of surface-by-surface third-order Seidel aberration coefficients.

## Export

```ts
function buildSurfaceBySurface3rdOrderChartOption(
  surfaceBySurface3rdOrderData: SeidelSurfaceBySurfaceData,
  chartWidth: number,
  chartHeight: number,
  textColor: string,
)
```

## Key Behaviors

- Registers the required ECharts modules: `BarChart`, `GridComponent`, `LegendComponent`, `TooltipComponent`, and `CanvasRenderer`.
- Uses the incoming `aberrTypes` array directly as:
  - the legend data
  - the series names
- Uses the incoming `surfaceLabels` array as the x-axis categories.
- Builds five bar series from `data[rowIdx]`, matching the row-wise `SeidelSurfaceBySurfaceData` contract.
- Configures the tooltip with:
  - `trigger: "axis"`
  - `axisPointer: { type: "shadow" }`
  - a shared analysis plot-value formatter that renders tooltip numeric values with 2 significant figures and clamps magnitudes smaller than `1e-7` to `0`
- Increases the inter-category spacing between grouped bar clusters by setting each bar series `barCategoryGap` to `"60%"`.
- Formats y-axis tick labels with the shared analysis plot-value formatter.
- Does not render a chart title.
- Applies the caller-provided `textColor` to legend labels, axis names, and axis tick labels so chart chrome follows the active light/dark theme.
- Does not override series colors, so ECharts’ default palette supplies the distinct legend/series colors.
