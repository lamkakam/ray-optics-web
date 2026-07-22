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

/**
 * Builds the ECharts option for field-curvature value-versus-field category plots.
 *
 * @remarks
 * ## Behavior
 *
 * - Registers line, grid, legend, tooltip, and canvas renderer modules.
 * - Produces exactly one `grid`, one value `xAxis`, and one category `yAxis`.
 * - Reuses the shared focus-shift x-axis, field-category y-axis, grid, split-line, and visible field-category tick behavior.
 * - Produces exactly two symbol-free line series: `Sagittal` and `Tangential`.
 * - Includes the ECharts legend option for the two field-curvature series.
 * - Enables an axis pointer through the tooltip configuration.
 */
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
