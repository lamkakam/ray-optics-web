import * as echarts from "echarts/core";
import { ScatterChart } from "echarts/charts";
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { SpotDiagramData } from "@/shared/lib/types/opticalModel";

echarts.use([ScatterChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

const SPOT_DIAGRAM_GRID_TOP = 48;
const SPOT_DIAGRAM_GRID_BOTTOM = 56;
const SPOT_DIAGRAM_GRID_LEFT = 72;
const SPOT_DIAGRAM_GRID_RIGHT = 32;
const SPOT_DIAGRAM_POINT_SIZE = 3;
const SPOT_DIAGRAM_POINT_OPACITY = 0.8;
const SPOT_DIAGRAM_PRECISION = 2;
const SPOT_DIAGRAM_SERIES_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
] as const;

function getAxisExtent(spotDiagramData: SpotDiagramData): number {
  let axisExtent = 0;

  for (const seriesData of spotDiagramData) {
    const pointCount = Math.min(seriesData.x.length, seriesData.y.length);
    for (let index = 0; index < pointCount; index += 1) {
      const x = seriesData.x[index] ?? 0;
      const y = seriesData.y[index] ?? 0;
      axisExtent = Math.max(axisExtent, Math.abs(x), Math.abs(y));
    }
  }

  return axisExtent > 0 ? axisExtent : 1e-6;
}

function getSeriesLabel(wavelengthLabels: readonly string[], wvlIdx: number): string {
  return wavelengthLabels[wvlIdx] ?? `Wavelength ${wvlIdx}`;
}

export function buildSpotDiagramOption(
  spotDiagramData: SpotDiagramData,
  wavelengthLabels: readonly string[],
  chartWidth: number,
  chartHeight: number,
) {
  const axisExtent = getAxisExtent(spotDiagramData);
  const maxPlotWidth = chartWidth - SPOT_DIAGRAM_GRID_LEFT - SPOT_DIAGRAM_GRID_RIGHT;
  const maxPlotHeight = chartHeight - SPOT_DIAGRAM_GRID_TOP - SPOT_DIAGRAM_GRID_BOTTOM;
  const plotSide = Math.max(0, Math.min(maxPlotWidth, maxPlotHeight));
  const extraHorizontalSpace = Math.max(0, maxPlotWidth - plotSide);
  const legendData = spotDiagramData.map((seriesData) => getSeriesLabel(wavelengthLabels, seriesData.wvlIdx));

  return {
    animation: false,
    tooltip: {
      trigger: "none",
      axisPointer: {
        type: "cross",
      },
    },
    legend: {
      top: 12,
      data: legendData,
    },
    grid: {
      left: SPOT_DIAGRAM_GRID_LEFT + extraHorizontalSpace / 2,
      right: SPOT_DIAGRAM_GRID_RIGHT - extraHorizontalSpace / 2,
      top: SPOT_DIAGRAM_GRID_TOP,
      width: plotSide,
      height: plotSide,
    },
    xAxis: {
      type: "value",
      min: -Number(axisExtent.toPrecision(SPOT_DIAGRAM_PRECISION)),
      max: Number(axisExtent.toPrecision(SPOT_DIAGRAM_PRECISION)),
      name: spotDiagramData[0]?.unitX ? `x (${spotDiagramData[0].unitX})` : "x",
      nameLocation: "middle",
      nameGap: 30,
    },
    yAxis: {
      type: "value",
      min: -Number(axisExtent.toPrecision(SPOT_DIAGRAM_PRECISION)),
      max: Number(axisExtent.toPrecision(SPOT_DIAGRAM_PRECISION)),
      name: spotDiagramData[0]?.unitY ? `y (${spotDiagramData[0].unitY})` : "y",
      nameLocation: "middle",
      nameGap: 36,
    },
    series: spotDiagramData.map((seriesData, index) => ({
      type: "scatter",
      name: getSeriesLabel(wavelengthLabels, seriesData.wvlIdx),
      data: seriesData.x.map((x, pointIndex) => [x, seriesData.y[pointIndex] ?? 0]),
      symbolSize: SPOT_DIAGRAM_POINT_SIZE,
      itemStyle: {
        color: SPOT_DIAGRAM_SERIES_COLORS[index % SPOT_DIAGRAM_SERIES_COLORS.length],
        opacity: SPOT_DIAGRAM_POINT_OPACITY,
      },
      progressive: 4096,
    })),
  };
}
