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
