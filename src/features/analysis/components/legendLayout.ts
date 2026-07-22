/**
# `features/analysis/components/legendLayout.ts`
*/
const LEGEND_MARKER_AND_GAP_WIDTH = 34;
const LEGEND_ITEM_GAP = 16;
const LEGEND_CHARACTER_WIDTH = 7;
const LEGEND_EXTRA_ROW_HEIGHT = 24;

export interface LegendWrapLayout {
  readonly left: number;
  readonly right: number;
  readonly extraTop: number;
}

function estimateLegendItemWidth(label: string): number {
  return LEGEND_MARKER_AND_GAP_WIDTH + label.length * LEGEND_CHARACTER_WIDTH + LEGEND_ITEM_GAP;
}

function estimateLegendRowCount(labels: readonly string[], availableWidth: number): number {
  if (labels.length === 0 || availableWidth <= 0) {
    return 1;
  }

  let rowCount = 1;
  let currentRowWidth = 0;

  for (const label of labels) {
    const itemWidth = estimateLegendItemWidth(label);
    if (currentRowWidth > 0 && currentRowWidth + itemWidth > availableWidth) {
      rowCount += 1;
      currentRowWidth = itemWidth;
    } else {
      currentRowWidth += itemWidth;
    }
  }

  return rowCount;
}

function estimateLegendRowWidth(labels: readonly string[]): number {
  return labels.reduce((totalWidth, label) => totalWidth + estimateLegendItemWidth(label), 0);
}

/**
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
*/
export function buildLegendWrapLayout(
  labels: readonly string[],
  chartWidth: number,
  left: number,
  right: number,
): LegendWrapLayout {
  const availableWidth = Math.max(0, chartWidth - left - right);
  const oneRowWidth = estimateLegendRowWidth(labels);
  const rowCount = estimateLegendRowCount(labels, availableWidth);

  if (labels.length > 0 && oneRowWidth <= availableWidth) {
    const sideInset = Math.floor((availableWidth - oneRowWidth) / 2);

    return {
      left: left + sideInset,
      right: right + sideInset,
      extraTop: 0,
    };
  }

  return {
    left,
    right,
    extraTop: Math.max(0, rowCount - 1) * LEGEND_EXTRA_ROW_HEIGHT,
  };
}
