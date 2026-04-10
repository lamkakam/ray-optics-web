# `features/analysis/shared/formatPlotValue.ts`

## Purpose

Defines a shared numeric formatter for analysis plots so chart tooltips, tick labels, visual-map labels, and rounded axis extents all present values consistently.

## Export

```ts
function formatPlotValue(value: number): string
```

## Key Behaviors

- Returns `"0"` for:
  - non-finite values
  - exact zero
  - any value whose absolute magnitude is smaller than `1e-9`
- Formats values whose absolute magnitude is at least `1e-9` but smaller than `1e-4` in scientific notation.
- Formats values whose absolute magnitude is larger than `1000` in scientific notation.
- Formats all other values to 2 significant figures.
- Normalizes the formatted output through `Number(...).toString()`, so insignificant trailing zeroes are removed.
- Can be reused for numeric axis bounds by wrapping the return value with `Number(...)`.
