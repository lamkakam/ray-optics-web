import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import {
  buildFieldCategoryLineAxesAndGrid,
  buildFieldCategoryLineSeries,
} from "@/features/analysis/components/fieldCategoryLineChartOption";
import type { AstigmatismCurveData } from "@/features/analysis/types/plotData";

echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

export function buildAstigmatismOption(
  astigmatismCurveData: AstigmatismCurveData,
  chartWidth: number,
  chartHeight: number,
  textColor: string,
) {
  const axesAndGrid = buildFieldCategoryLineAxesAndGrid(astigmatismCurveData, chartWidth, chartHeight, textColor);

  return {
    animation: false,
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "cross",
      },
    },
    ...axesAndGrid,
    series: buildFieldCategoryLineSeries([
      { name: "Astigmatism", data: astigmatismCurveData.Astigmatism },
    ]),
  };
}
