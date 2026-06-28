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

export function buildLegendWrapLayout(
  labels: readonly string[],
  chartWidth: number,
  left: number,
  right: number,
): LegendWrapLayout {
  const availableWidth = Math.max(0, chartWidth - left - right);
  const rowCount = estimateLegendRowCount(labels, availableWidth);

  return {
    left,
    right,
    extraTop: Math.max(0, rowCount - 1) * LEGEND_EXTRA_ROW_HEIGHT,
  };
}
