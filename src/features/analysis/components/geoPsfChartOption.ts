import * as echarts from "echarts/core";
import { ScatterChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { GeoPsfData } from "@/shared/lib/types/opticalModel";

echarts.use([ScatterChart, GridComponent, TooltipComponent, CanvasRenderer]);

const GEO_PSF_GRID_TOP = 16;
const GEO_PSF_GRID_BOTTOM = 56;
const GEO_PSF_GRID_LEFT = 72;
const GEO_PSF_GRID_RIGHT = 32;
const GEO_PSF_POINT_SIZE = 1;
const GEO_PSF_POINT_COLOR = "#5470c6";
const GEO_PSF_POINT_OPACITY = 0.65;
const PRECISION = 2;

export function buildGeoPsfOption(
  geoPsfData: GeoPsfData,
  chartWidth: number,
  chartHeight: number,
  textColor: string,
) {
  let axisExtent = 0;
  const pointData: number[][] = [];
  const pointCount = Math.min(geoPsfData.x.length, geoPsfData.y.length);

  for (let index = 0; index < pointCount; index += 1) {
    const x = geoPsfData.x[index] ?? 0;
    const y = geoPsfData.y[index] ?? 0;
    axisExtent = Math.max(axisExtent, Math.abs(x), Math.abs(y));
    pointData.push([x, y]);
  }

  const normalizedAxisExtent = axisExtent > 0 ? axisExtent : 1e-6;
  const maxPlotWidth = chartWidth - GEO_PSF_GRID_LEFT - GEO_PSF_GRID_RIGHT;
  const maxPlotHeight = chartHeight - GEO_PSF_GRID_TOP - GEO_PSF_GRID_BOTTOM;
  const plotSide = Math.max(0, Math.min(maxPlotWidth, maxPlotHeight));
  const extraHorizontalSpace = Math.max(0, maxPlotWidth - plotSide);

  return {
    animation: false,
    tooltip: {
      trigger: "none",
      axisPointer: {
        type: "cross",
      },
    },
    grid: {
      left: GEO_PSF_GRID_LEFT + extraHorizontalSpace / 2,
      right: GEO_PSF_GRID_RIGHT - extraHorizontalSpace / 2,
      top: GEO_PSF_GRID_TOP,
      width: plotSide,
      height: plotSide,
    },
    xAxis: {
      type: "value",
      min: -normalizedAxisExtent.toPrecision(PRECISION),
      max: normalizedAxisExtent.toPrecision(PRECISION),
      name: geoPsfData.unitX ? `x (${geoPsfData.unitX})` : "x",
      nameLocation: "middle",
      nameGap: 30,
      nameTextStyle: {
        color: textColor,
      },
      axisLabel: {
        color: textColor,
      },
    },
    yAxis: {
      type: "value",
      min: -normalizedAxisExtent.toPrecision(PRECISION),
      max: normalizedAxisExtent.toPrecision(PRECISION),
      name: geoPsfData.unitY ? `y (${geoPsfData.unitY})` : "y",
      nameLocation: "middle",
      nameGap: 36,
      nameTextStyle: {
        color: textColor,
      },
      axisLabel: {
        color: textColor,
      },
    },
    series: [
      {
        type: "scatter",
        data: pointData,
        symbolSize: GEO_PSF_POINT_SIZE,
        itemStyle: {
          color: GEO_PSF_POINT_COLOR,
          opacity: GEO_PSF_POINT_OPACITY,
        },
        progressive: 4096,
      },
    ],
  };
}
