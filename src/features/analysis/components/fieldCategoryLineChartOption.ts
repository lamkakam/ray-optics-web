import { formatPlotValue } from "@/shared/lib/chart-formatting/formatPlotValue";
import type { LineAxisData } from "@/features/analysis/types/plotData";

export const FIELD_CATEGORY_LINE_GRID_TOP = 36;
export const FIELD_CATEGORY_LINE_GRID_BOTTOM = 56;
export const FIELD_CATEGORY_LINE_GRID_LEFT = 72;
export const FIELD_CATEGORY_LINE_GRID_RIGHT = 28;
export const FIELD_CATEGORY_LINE_SPLIT_LINE_COLOR = "#d1d5db";
const FIELD_CATEGORY_LINE_MAX_VISIBLE_Y_TICKS = 5;

export interface FieldCategoryLineSeriesDefinition {
  readonly name: string;
  readonly data: LineAxisData;
}

export interface FieldCategoryLineData {
  readonly fieldLabels: readonly string[];
  readonly unitX?: string;
  readonly unitY?: string;
}

export function toFieldCategoryLineData(axisData: LineAxisData): number[][] {
  const pointCount = Math.min(axisData.x.length, axisData.y.length);
  const lineData: number[][] = [];

  for (let index = 0; index < pointCount; index += 1) {
    lineData.push([axisData.x[index], axisData.y[index]]);
  }

  return lineData;
}

export function buildVisibleFieldCategoryPredicate(fieldLabelCount: number): (index: number) => boolean {
  if (fieldLabelCount <= FIELD_CATEGORY_LINE_MAX_VISIBLE_Y_TICKS) {
    return () => true;
  }

  const lastFieldLabelIndex = fieldLabelCount - 1;
  const visibleFieldCategoryIndices = new Set<number>();

  for (let tickIndex = 0; tickIndex < FIELD_CATEGORY_LINE_MAX_VISIBLE_Y_TICKS; tickIndex += 1) {
    visibleFieldCategoryIndices.add(
      Math.round((tickIndex * lastFieldLabelIndex) / (FIELD_CATEGORY_LINE_MAX_VISIBLE_Y_TICKS - 1)),
    );
  }

  return (index: number) => visibleFieldCategoryIndices.has(index);
}

export function buildFieldCategoryLineAxesAndGrid(
  data: FieldCategoryLineData,
  chartWidth: number,
  chartHeight: number,
  textColor: string,
) {
  const isVisibleFieldCategory = buildVisibleFieldCategoryPredicate(data.fieldLabels.length);

  return {
    grid: {
      left: FIELD_CATEGORY_LINE_GRID_LEFT,
      right: FIELD_CATEGORY_LINE_GRID_RIGHT,
      top: FIELD_CATEGORY_LINE_GRID_TOP,
      bottom: FIELD_CATEGORY_LINE_GRID_BOTTOM,
      width: Math.max(0, chartWidth - FIELD_CATEGORY_LINE_GRID_LEFT - FIELD_CATEGORY_LINE_GRID_RIGHT),
      height: Math.max(0, chartHeight - FIELD_CATEGORY_LINE_GRID_TOP - FIELD_CATEGORY_LINE_GRID_BOTTOM),
    },
    xAxis: {
      type: "value",
      name: data.unitX === "D"
        ? "Output Vergence (D)"
        : data.unitX ? `Focus Shift (${data.unitX})` : "Focus Shift",
      nameLocation: "middle",
      nameGap: 34,
      nameTextStyle: {
        color: textColor,
      },
      axisLabel: {
        color: textColor,
        formatter: (value: number) => formatPlotValue(value),
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: FIELD_CATEGORY_LINE_SPLIT_LINE_COLOR,
          width: 1,
          type: "solid",
        },
      },
    },
    yAxis: {
      type: "category",
      data: data.fieldLabels,
      name: data.unitY ? `Field (${data.unitY})` : "Field",
      nameLocation: "middle",
      nameGap: 50,
      nameTextStyle: {
        color: textColor,
      },
      axisLabel: {
        color: textColor,
        interval: isVisibleFieldCategory,
      },
      axisTick: {
        interval: isVisibleFieldCategory,
      },
      splitLine: {
        show: true,
        interval: isVisibleFieldCategory,
        lineStyle: {
          color: FIELD_CATEGORY_LINE_SPLIT_LINE_COLOR,
          width: 1,
          type: "solid",
        },
      },
    },
  };
}

export function buildFieldCategoryLineSeries(
  seriesDefinitions: readonly FieldCategoryLineSeriesDefinition[],
) {
  return seriesDefinitions.map((seriesDefinition) => ({
    name: seriesDefinition.name,
    type: "line",
    data: toFieldCategoryLineData(seriesDefinition.data),
    showSymbol: false,
  }));
}
