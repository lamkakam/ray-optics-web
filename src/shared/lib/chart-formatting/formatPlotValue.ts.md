# `shared/lib/chart-formatting/formatPlotValue.ts`

## Purpose

Defines shared numeric formatters for chart labels, tooltips, and rounded axis extents, including log-scale axis labels that must stay renderable at the minimum non-zero plot floor.

## Export

```ts
const MINIMUM_NON_ZERO_PLOT_VALUE: number
const MINIMUM_DECIMAL_PLOT_VALUE: number
function formatPlotValue(value: number): string
function formatLogScalePlotValue(value: number): string
```

## Key Behaviors

- `MINIMUM_NON_ZERO_PLOT_VALUE` is `1e-9`.
- `MINIMUM_DECIMAL_PLOT_VALUE` is `1e-3`.
- `formatPlotValue` returns `"0"` for:
  - non-finite values
  - exact zero
  - any value whose absolute magnitude is smaller than `1e-9`
- `formatPlotValue` formats values whose absolute magnitude is at least `1e-9` but smaller than `1e-3` in scientific notation.
- `formatPlotValue` formats values whose absolute magnitude is larger than `1000` in scientific notation.
- `formatPlotValue` formats all other values to 2 significant figures.
- `formatPlotValue` normalizes the formatted output through `Number(...).toString()`, so insignificant trailing zeroes are removed.
- `formatLogScalePlotValue` returns `"0"` for non-finite values.
- `formatLogScalePlotValue` returns `"1e-9"` for any finite value less than or equal to `1e-9`, so log-axis labels never show an unplottable zero floor.
- `formatLogScalePlotValue` delegates larger values to `formatPlotValue`.
