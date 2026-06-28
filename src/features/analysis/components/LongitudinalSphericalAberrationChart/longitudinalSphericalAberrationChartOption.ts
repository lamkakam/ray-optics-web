import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import {
  FIELD_CATEGORY_LINE_GRID_BOTTOM,
  FIELD_CATEGORY_LINE_GRID_LEFT,
  FIELD_CATEGORY_LINE_GRID_RIGHT,
  FIELD_CATEGORY_LINE_GRID_TOP,
  FIELD_CATEGORY_LINE_SPLIT_LINE_COLOR,
  toFieldCategoryLineData,
} from "@/features/analysis/components/fieldCategoryLineChartOption";
import { buildLegendWrapLayout } from "@/features/analysis/components/legendLayout";
import { formatPlotValue } from "@/shared/lib/chart-formatting/formatPlotValue";
import type { LongitudinalSphericalAberrationData } from "@/features/analysis/types/plotData";

echarts.use([LineChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

export function buildLongitudinalSphericalAberrationOption(
  lsaData: LongitudinalSphericalAberrationData,
  wavelengthLabels: readonly string[],
  chartWidth: number,
  chartHeight: number,
  textColor: string,
) {
  const unitX = lsaData[0]?.unitX;
  const legendData = lsaData.map((seriesData) => wavelengthLabels[seriesData.wvlIdx] ?? `Wavelength ${seriesData.wvlIdx + 1}`);
  const legendLayout = buildLegendWrapLayout(
    legendData,
    chartWidth,
    FIELD_CATEGORY_LINE_GRID_LEFT,
    FIELD_CATEGORY_LINE_GRID_RIGHT,
  );
  const gridTop = FIELD_CATEGORY_LINE_GRID_TOP + legendLayout.extraTop;

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
      left: legendLayout.left,
      right: legendLayout.right,
      data: legendData,
      textStyle: {
        color: textColor,
      },
    },
    grid: {
      left: FIELD_CATEGORY_LINE_GRID_LEFT,
      right: FIELD_CATEGORY_LINE_GRID_RIGHT,
      top: gridTop,
      bottom: FIELD_CATEGORY_LINE_GRID_BOTTOM,
      width: Math.max(0, chartWidth - FIELD_CATEGORY_LINE_GRID_LEFT - FIELD_CATEGORY_LINE_GRID_RIGHT),
      height: Math.max(0, chartHeight - gridTop - FIELD_CATEGORY_LINE_GRID_BOTTOM),
    },
    xAxis: {
      type: "value",
      name: unitX ? `Longitudinal Focus Shift (${unitX})` : "Longitudinal Focus Shift",
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
      type: "value",
      name: "Normalized Pupil Coordinate",
      nameLocation: "middle",
      nameGap: 50,
      min: 0,
      max: 1,
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
    series: lsaData.map((seriesData, index) => ({
      name: legendData[index],
      type: "line",
      data: toFieldCategoryLineData(seriesData.LSA),
      showSymbol: false,
    })),
  };
}
