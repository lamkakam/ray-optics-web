import * as echarts from "echarts/core";
import { ScatterChart } from "echarts/charts";
import { GridComponent, TooltipComponent, VisualMapComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { DiffractionPsfData } from "@/shared/lib/types/opticalModel";

echarts.use([ScatterChart, GridComponent, TooltipComponent, VisualMapComponent, CanvasRenderer]);

const DIFFRACTION_PSF_COLOR_PALETTE = [
  "#313695",
  "#4575b4",
  "#74add1",
  "#abd9e9",
  "#e0f3f8",
  "#ffffbf",
  "#fee090",
  "#fdae61",
  "#f46d43",
  "#d73027",
  "#a50026",
] as const;

const DIFFRACTION_PSF_MIN_INTENSITY = 5e-4;
const DIFFRACTION_GRID_TOP = 16;
const DIFFRACTION_GRID_BOTTOM = 56;
const DIFFRACTION_GRID_LEFT = 72;
const DIFFRACTION_GRID_RIGHT = 160;
const DIFFRACTION_VISUAL_MAP_WIDTH = 20;
const DIFFRACTION_VISUAL_MAP_MAX_HEIGHT = 152;
const DIFFRACTION_RIGHT_PADDING = 16;
const PRECISION = 2;

export function formatDiffractionPsfIntensity(log10Intensity: number): string {
  return Number(10 ** log10Intensity).toPrecision(PRECISION);
}

export function buildDiffractionPsfOption(
  diffractionPsfData: DiffractionPsfData,
  chartWidth: number,
  chartHeight: number,
) {
  let axisExtent = 0;
  let maxClippedIntensity = DIFFRACTION_PSF_MIN_INTENSITY;
  const scatterData: number[][] = [];

  for (let xIndex = 0; xIndex < diffractionPsfData.x.length; xIndex += 1) {
    const x = diffractionPsfData.x[xIndex];
    axisExtent = Math.max(axisExtent, Math.abs(x));
    for (let yIndex = 0; yIndex < diffractionPsfData.y.length; yIndex += 1) {
      const y = diffractionPsfData.y[yIndex];
      const clippedIntensity = Math.max(
        diffractionPsfData.z[xIndex]?.[yIndex] ?? 0,
        DIFFRACTION_PSF_MIN_INTENSITY,
      );
      axisExtent = Math.max(axisExtent, Math.abs(y));
      maxClippedIntensity = Math.max(maxClippedIntensity, clippedIntensity);
      scatterData.push([x, y, Math.log10(clippedIntensity)]);
    }
  }

  const normalizedAxisExtent = axisExtent > 0 ? axisExtent : 1;
  const visualMapMin = Math.log10(DIFFRACTION_PSF_MIN_INTENSITY);
  const visualMapMax = Math.max(visualMapMin, Math.log10(maxClippedIntensity));
  const maxPlotWidth = chartWidth - DIFFRACTION_GRID_LEFT - DIFFRACTION_GRID_RIGHT;
  const maxPlotHeight = chartHeight - DIFFRACTION_GRID_TOP - DIFFRACTION_GRID_BOTTOM;
  const plotSide = Math.max(0, Math.min(maxPlotWidth, maxPlotHeight));
  const extraHorizontalSpace = Math.max(0, maxPlotWidth - plotSide);
  const visualMapHeight = Math.max(
    0,
    Math.min(
      DIFFRACTION_VISUAL_MAP_MAX_HEIGHT,
      chartHeight - (DIFFRACTION_GRID_TOP * 2),
    ),
  );

  return {
    animation: false,
    tooltip: {
      trigger: "none",
      axisPointer: {
        type: "cross",
      },
    },
    grid: {
      left: DIFFRACTION_GRID_LEFT + extraHorizontalSpace / 2,
      right: DIFFRACTION_GRID_RIGHT - extraHorizontalSpace / 2,
      top: DIFFRACTION_GRID_TOP,
      width: plotSide,
      height: plotSide,
    },
    xAxis: {
      type: "value",
      min: -normalizedAxisExtent.toPrecision(PRECISION),
      max: normalizedAxisExtent.toPrecision(PRECISION),
      name: diffractionPsfData.unitX ? `x (${diffractionPsfData.unitX})` : "x",
      nameLocation: "middle",
      nameGap: 30,
    },
    yAxis: {
      type: "value",
      min: -normalizedAxisExtent.toPrecision(PRECISION),
      max: normalizedAxisExtent.toPrecision(PRECISION),
      name: diffractionPsfData.unitY ? `y (${diffractionPsfData.unitY})` : "y",
      nameLocation: "middle",
      nameGap: 36,
    },
    visualMap: {
      type: "continuous",
      dimension: 2,
      min: visualMapMin,
      max: visualMapMax,
      calculable: false,
      orient: "vertical",
      right: DIFFRACTION_RIGHT_PADDING,
      top: "middle",
      itemWidth: DIFFRACTION_VISUAL_MAP_WIDTH,
      itemHeight: visualMapHeight,
      formatter: formatDiffractionPsfIntensity,
      inRange: {
        color: DIFFRACTION_PSF_COLOR_PALETTE,
      },
    },
    series: [
      {
        type: "scatter",
        data: scatterData,
        symbolSize: 6,
        progressive: 4096,
      },
    ],
  };
}
