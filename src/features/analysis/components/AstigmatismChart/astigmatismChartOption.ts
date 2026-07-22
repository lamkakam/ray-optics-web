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

/**
Builds the ECharts option for wavelength-specific astigmatism focal-separation curves.

## Behavior

- Registers line, grid, tooltip, and canvas renderer modules.
- Does not register `LegendComponent`.
- Does not emit a `legend` option.
- Produces exactly one `grid`, one value `xAxis`, and one category `yAxis`.
- Reuses the shared focus-shift x-axis, field-category y-axis, grid, split-line, and visible field-category tick behavior.
- Produces exactly one symbol-free line series named `Astigmatism`.
- Enables a crosshair axis pointer through the tooltip configuration.
*/
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
