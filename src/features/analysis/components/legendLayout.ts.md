# `features/analysis/components/legendLayout.ts`

## Purpose

Provides feature-local layout helpers for analysis chart legends that can wrap onto multiple rows on narrow chart widths.

## Exports

```ts
function buildLegendWrapLayout(
  labels: readonly string[],
  chartWidth: number,
  left: number,
  right: number,
): LegendWrapLayout
```

## Behavior

- Estimates legend item widths from label length, marker width, marker-label spacing, and a fixed item gap.
- Computes how many legend rows fit between the supplied `left` and `right` bounds.
- When all legend items fit on one row, returns tightened `left` and `right` offsets that center the estimated legend row within the supplied bounds.
- When legend items do not fit on one row, returns the same legend bounds for the ECharts legend so ECharts wraps within the measured width.
- Returns `extraTop` as `24px` for each legend row beyond the first.
- Returns zero extra top spacing for empty legends, invalid widths, and one-row legends.
