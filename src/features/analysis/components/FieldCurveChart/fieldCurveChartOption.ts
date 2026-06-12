import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { formatPlotValue } from "@/shared/lib/chart-formatting/formatPlotValue";
import type { FieldCurveData, LineAxisData } from "@/features/analysis/types/plotData";

echarts.use([LineChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

const FIELD_CURVE_GRID_TOP = 36;
const FIELD_CURVE_GRID_BOTTOM = 56;
const FIELD_CURVE_GRID_LEFT = 72;
const FIELD_CURVE_GRID_RIGHT = 28;
const FIELD_CURVE_SPLIT_LINE_COLOR = "#d1d5db";
const FIELD_CURVE_MAX_VISIBLE_Y_TICKS = 5;

function toLineData(axisData: LineAxisData): number[][] {
  const pointCount = Math.min(axisData.x.length, axisData.y.length);
  const lineData: number[][] = [];

  for (let index = 0; index < pointCount; index += 1) {
    lineData.push([axisData.x[index], axisData.y[index]]);
  }

  return lineData;
}

function buildVisibleFieldCategoryPredicate(fieldLabelCount: number): (index: number) => boolean {
  if (fieldLabelCount <= FIELD_CURVE_MAX_VISIBLE_Y_TICKS) {
    return () => true;
  }

  const lastFieldLabelIndex = fieldLabelCount - 1;
  const visibleFieldCategoryIndices = new Set<number>();

  for (let tickIndex = 0; tickIndex < FIELD_CURVE_MAX_VISIBLE_Y_TICKS; tickIndex += 1) {
    visibleFieldCategoryIndices.add(
      Math.round((tickIndex * lastFieldLabelIndex) / (FIELD_CURVE_MAX_VISIBLE_Y_TICKS - 1)),
    );
  }

  return (index: number) => visibleFieldCategoryIndices.has(index);
}

export function buildFieldCurveOption(
  fieldCurveData: FieldCurveData,
  chartWidth: number,
  chartHeight: number,
  textColor: string,
) {
  const isVisibleFieldCategory = buildVisibleFieldCategoryPredicate(fieldCurveData.fieldLabels.length);

  return {
    animation: false,
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "cross",
      },
    },
    legend: {
      top: 0,
      textStyle: {
        color: textColor,
      },
    },
    grid: {
      left: FIELD_CURVE_GRID_LEFT,
      right: FIELD_CURVE_GRID_RIGHT,
      top: FIELD_CURVE_GRID_TOP,
      bottom: FIELD_CURVE_GRID_BOTTOM,
      width: Math.max(0, chartWidth - FIELD_CURVE_GRID_LEFT - FIELD_CURVE_GRID_RIGHT),
      height: Math.max(0, chartHeight - FIELD_CURVE_GRID_TOP - FIELD_CURVE_GRID_BOTTOM),
    },
    xAxis: {
      type: "value",
      name: fieldCurveData.unitX ? `Focus Shift (${fieldCurveData.unitX})` : "Focus Shift",
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
          color: FIELD_CURVE_SPLIT_LINE_COLOR,
          width: 1,
          type: "solid",
        },
      },
    },
    yAxis: {
      type: "category",
      data: fieldCurveData.fieldLabels,
      name: fieldCurveData.unitY ? `Field (${fieldCurveData.unitY})` : "Field",
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
          color: FIELD_CURVE_SPLIT_LINE_COLOR,
          width: 1,
          type: "solid",
        },
      },
    },
    series: [
      {
        name: "Sagittal",
        type: "line",
        data: toLineData(fieldCurveData.Sagittal),
        showSymbol: false,
      },
      {
        name: "Tangential",
        type: "line",
        data: toLineData(fieldCurveData.Tangential),
        showSymbol: false,
      },
    ],
  };
}
