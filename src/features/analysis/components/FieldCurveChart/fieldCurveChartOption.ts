import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import {
  buildFieldCategoryLineAxesAndGrid,
  buildFieldCategoryLineSeries,
} from "@/features/analysis/components/fieldCategoryLineChartOption";
import type { FieldCurveData } from "@/features/analysis/types/plotData";

echarts.use([LineChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

function buildFieldCurveSeriesDefinitions(fieldCurveData: FieldCurveData) {
  return [
    { name: "Sagittal", data: fieldCurveData.Sagittal },
    { name: "Tangential", data: fieldCurveData.Tangential },
  ];
}

export function buildFieldCurveOption(
  fieldCurveData: FieldCurveData,
  chartWidth: number,
  chartHeight: number,
  textColor: string,
) {
  const axesAndGrid = buildFieldCategoryLineAxesAndGrid(fieldCurveData, chartWidth, chartHeight, textColor);

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
    ...axesAndGrid,
    series: buildFieldCategoryLineSeries(buildFieldCurveSeriesDefinitions(fieldCurveData)),
  };
}
