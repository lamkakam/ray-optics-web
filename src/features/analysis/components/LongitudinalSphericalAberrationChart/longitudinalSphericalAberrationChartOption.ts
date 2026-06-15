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
      left: FIELD_CATEGORY_LINE_GRID_LEFT,
      right: FIELD_CATEGORY_LINE_GRID_RIGHT,
      top: FIELD_CATEGORY_LINE_GRID_TOP,
      bottom: FIELD_CATEGORY_LINE_GRID_BOTTOM,
      width: Math.max(0, chartWidth - FIELD_CATEGORY_LINE_GRID_LEFT - FIELD_CATEGORY_LINE_GRID_RIGHT),
      height: Math.max(0, chartHeight - FIELD_CATEGORY_LINE_GRID_TOP - FIELD_CATEGORY_LINE_GRID_BOTTOM),
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
    series: lsaData.map((seriesData) => ({
      name: wavelengthLabels[seriesData.wvlIdx] ?? `Wavelength ${seriesData.wvlIdx + 1}`,
      type: "line",
      data: toFieldCategoryLineData(seriesData.LSA),
      showSymbol: false,
    })),
  };
}
