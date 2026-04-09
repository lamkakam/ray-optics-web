# `features/analysis/components/surfaceBySurface3rdOrderChartOption.ts`

## Purpose

Builds the ECharts option object for the analysis panel’s grouped bar chart of surface-by-surface third-order Seidel aberration coefficients.

## Export

```ts
function buildSurfaceBySurface3rdOrderChartOption(
  surfaceBySurface3rdOrderData: SeidelSurfaceBySurfaceData,
  chartWidth: number,
  chartHeight: number,
)
```

## Key Behaviors

- Registers the required ECharts modules: `BarChart`, `GridComponent`, `LegendComponent`, `TitleComponent`, `TooltipComponent`, and `CanvasRenderer`.
- Uses the incoming `aberrTypes` array directly as:
  - the legend data
  - the series names
- Uses the incoming `surfaceLabels` array as the x-axis categories.
- Builds five bar series from `data[rowIdx]`, matching the row-wise `SeidelSurfaceBySurfaceData` contract.
- Configures the tooltip with:

```ts
tooltip: {
  trigger: "axis",
  axisPointer: { type: "cross" },
}
```

- Does not override series colors, so ECharts’ default palette supplies the distinct legend/series colors.
