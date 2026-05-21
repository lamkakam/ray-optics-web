import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { formatPlotValue } from "@/shared/lib/chart-formatting/formatPlotValue";
import type { StrehlVsWavelengthData } from "@/features/analysis/types/plotData";

echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

const STREHL_GRID_TOP = 24;
const STREHL_GRID_BOTTOM = 56;
const STREHL_GRID_LEFT = 64;
const STREHL_GRID_RIGHT = 28;

function toLineData(strehlVsWavelengthData: StrehlVsWavelengthData): number[][] {
  const pointCount = Math.min(strehlVsWavelengthData.x.length, strehlVsWavelengthData.y.length);
  const lineData: number[][] = [];

  for (let index = 0; index < pointCount; index += 1) {
    lineData.push([strehlVsWavelengthData.x[index], strehlVsWavelengthData.y[index]]);
  }

  return lineData;
}

export function buildStrehlVsWavelengthOption(
  strehlVsWavelengthData: StrehlVsWavelengthData,
  chartWidth: number,
  chartHeight: number,
  textColor: string,
) {
  const xAxisMin = strehlVsWavelengthData.x[0];
  const xAxisMax = strehlVsWavelengthData.x[strehlVsWavelengthData.x.length - 1];

  return {
    animation: false,
    tooltip: {
      trigger: "none",
      axisPointer: {
        type: "cross",
      },
    },
    grid: {
      left: STREHL_GRID_LEFT,
      right: STREHL_GRID_RIGHT,
      top: STREHL_GRID_TOP,
      bottom: STREHL_GRID_BOTTOM,
      width: Math.max(0, chartWidth - STREHL_GRID_LEFT - STREHL_GRID_RIGHT),
      height: Math.max(0, chartHeight - STREHL_GRID_TOP - STREHL_GRID_BOTTOM),
    },
    xAxis: {
      type: "value",
      min: xAxisMin,
      max: xAxisMax,
      name: strehlVsWavelengthData.unitX ? `Wavelength (${strehlVsWavelengthData.unitX})` : "Wavelength",
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
      type: "value",
      min: 0,
      max: 1,
      name: "Strehl Ratio",
      nameLocation: "middle",
      nameGap: 42,
      nameTextStyle: {
        color: textColor,
      },
      axisLabel: {
        color: textColor,
        formatter: (value: number) => formatPlotValue(value),
      },
    },
    series: [
      {
        name: "Strehl",
        type: "line",
        data: toLineData(strehlVsWavelengthData),
        showSymbol: false,
      },
    ],
  };
}
