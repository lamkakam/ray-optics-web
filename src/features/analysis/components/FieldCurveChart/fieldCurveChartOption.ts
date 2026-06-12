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

function toLineData(axisData: LineAxisData): number[][] {
  const pointCount = Math.min(axisData.x.length, axisData.y.length);
  const lineData: number[][] = [];

  for (let index = 0; index < pointCount; index += 1) {
    lineData.push([axisData.x[index], axisData.y[index]]);
  }

  return lineData;
}

export function buildFieldCurveOption(
  fieldCurveData: FieldCurveData,
  chartWidth: number,
  chartHeight: number,
  textColor: string,
) {
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
