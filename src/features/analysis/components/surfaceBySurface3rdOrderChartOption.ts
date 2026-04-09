import * as echarts from "echarts/core";
import { BarChart } from "echarts/charts";
import { GridComponent, LegendComponent, TitleComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { SeidelSurfaceBySurfaceData } from "@/shared/lib/types/opticalModel";

echarts.use([BarChart, GridComponent, LegendComponent, TitleComponent, TooltipComponent, CanvasRenderer]);

const SURFACE_BY_SURFACE_GRID_TOP = 72;
const SURFACE_BY_SURFACE_GRID_BOTTOM = 56;
const SURFACE_BY_SURFACE_GRID_LEFT = 64;
const SURFACE_BY_SURFACE_GRID_RIGHT = 28;
const SURFACE_BY_SURFACE_LEGEND_TOP = 12;
const SURFACE_BY_SURFACE_TITLE_TOP = 40;

export function buildSurfaceBySurface3rdOrderChartOption(
  surfaceBySurface3rdOrderData: SeidelSurfaceBySurfaceData,
  chartWidth: number,
  chartHeight: number,
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
      top: SURFACE_BY_SURFACE_LEGEND_TOP,
      data: surfaceBySurface3rdOrderData.aberrTypes,
    },
    title: {
      text: "Surface by Surface 3rd Order Aberrations",
      top: SURFACE_BY_SURFACE_TITLE_TOP,
      left: chartWidth / 2,
    },
    grid: {
      top: SURFACE_BY_SURFACE_GRID_TOP,
      bottom: SURFACE_BY_SURFACE_GRID_BOTTOM,
      left: SURFACE_BY_SURFACE_GRID_LEFT,
      right: SURFACE_BY_SURFACE_GRID_RIGHT,
      width: Math.max(0, chartWidth - SURFACE_BY_SURFACE_GRID_LEFT - SURFACE_BY_SURFACE_GRID_RIGHT),
      height: Math.max(0, chartHeight - SURFACE_BY_SURFACE_GRID_TOP - SURFACE_BY_SURFACE_GRID_BOTTOM),
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: surfaceBySurface3rdOrderData.surfaceLabels,
      name: "Surface",
      nameLocation: "middle",
      nameGap: 32,
    },
    yAxis: {
      type: "value",
      name: "3rd Order Aberrations",
      nameLocation: "middle",
      nameGap: 48,
    },
    series: surfaceBySurface3rdOrderData.aberrTypes.map((aberrationType, rowIndex) => ({
      type: "bar",
      name: aberrationType,
      emphasis: {
        focus: "series",
      },
      data: surfaceBySurface3rdOrderData.data[rowIndex] ?? [],
    })),
  };
}
