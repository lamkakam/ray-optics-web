import * as echarts from "echarts/core";
import { HeatmapChart } from "echarts/charts";
import { GridComponent, TooltipComponent, VisualMapComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { ANALYSIS_HEATMAP_COLOR_PALETTE } from "@/features/analysis/components/analysisChartPalette";
import type { WavefrontMapData } from "@/shared/lib/types/opticalModel";

echarts.use([HeatmapChart, GridComponent, TooltipComponent, VisualMapComponent, CanvasRenderer]);

const WAVEFRONT_GRID_TOP = 16;
const WAVEFRONT_GRID_BOTTOM = 56;
const WAVEFRONT_GRID_LEFT = 72;
const WAVEFRONT_GRID_RIGHT = 160;
const WAVEFRONT_VISUAL_MAP_WIDTH = 20;
const WAVEFRONT_VISUAL_MAP_MAX_HEIGHT = 152;
const WAVEFRONT_RIGHT_PADDING = 16;
const VALUE_PRECISION = 2;

function formatWavefrontValue(value: number): string {
  return value.toFixed(VALUE_PRECISION);
}

function formatWavefrontAxisTick(value: number): string {
  return Number(value).toPrecision(VALUE_PRECISION);
}

function formatWavefrontAxisPointerLabel(params: {
  axisDimension?: string;
  value: number;
}): string {
  if (params.axisDimension === "x" || params.axisDimension === "y") {
    return formatWavefrontAxisTick(params.value);
  }
  return formatWavefrontValue(params.value);
}

export function buildWavefrontMapOption(
  wavefrontMapData: WavefrontMapData,
  chartWidth: number,
  chartHeight: number,
  textColor: string,
) {
  const heatmapData: Array<[number, number, number]> = [];
  let minValue = Number.POSITIVE_INFINITY;
  let maxValue = Number.NEGATIVE_INFINITY;

  for (let yIndex = 0; yIndex < wavefrontMapData.y.length; yIndex += 1) {
    for (let xIndex = 0; xIndex < wavefrontMapData.x.length; xIndex += 1) {
      const value = wavefrontMapData.z[yIndex]?.[xIndex];
      if (value === undefined) continue;
      minValue = Math.min(minValue, value);
      maxValue = Math.max(maxValue, value);
      heatmapData.push([xIndex, yIndex, value]);
    }
  }

  const normalizedMin = Number.isFinite(minValue) ? minValue : 0;
  const normalizedMax = Number.isFinite(maxValue) ? Math.max(normalizedMin, maxValue) : 0;
  const maxPlotWidth = chartWidth - WAVEFRONT_GRID_LEFT - WAVEFRONT_GRID_RIGHT;
  const maxPlotHeight = chartHeight - WAVEFRONT_GRID_TOP - WAVEFRONT_GRID_BOTTOM;
  const plotSide = Math.max(0, Math.min(maxPlotWidth, maxPlotHeight));
  const extraHorizontalSpace = Math.max(0, maxPlotWidth - plotSide);
  const visualMapHeight = Math.max(
    0,
    Math.min(
      WAVEFRONT_VISUAL_MAP_MAX_HEIGHT,
      chartHeight - (WAVEFRONT_GRID_TOP * 2),
    ),
  );

  return {
    animation: false,
    tooltip: {
      trigger: "item",
      axisPointer: {
        type: "cross",
        label: {
          formatter: formatWavefrontAxisPointerLabel,
        },
      },
      formatter: (params: { data: [number, number, number] }) => formatWavefrontValue(params.data[2]),
    },
    grid: {
      left: WAVEFRONT_GRID_LEFT + extraHorizontalSpace / 2,
      right: WAVEFRONT_GRID_RIGHT - extraHorizontalSpace / 2,
      top: WAVEFRONT_GRID_TOP,
      width: plotSide,
      height: plotSide,
    },
    xAxis: {
      type: "category",
      data: wavefrontMapData.x,
      name: wavefrontMapData.unitX ? `x (${wavefrontMapData.unitX})` : "x",
      nameLocation: "middle",
      nameGap: 30,
      axisLabel: {
        color: textColor,
        formatter: formatWavefrontAxisTick,
      },
      nameTextStyle: {
        color: textColor,
      },
    },
    yAxis: {
      type: "category",
      data: wavefrontMapData.y,
      name: wavefrontMapData.unitY ? `y (${wavefrontMapData.unitY})` : "y",
      nameLocation: "middle",
      nameGap: 40,
      axisLabel: {
        color: textColor,
        formatter: formatWavefrontAxisTick,
      },
      nameTextStyle: {
        color: textColor,
      },
    },
    visualMap: {
      type: "continuous",
      min: normalizedMin,
      max: normalizedMax,
      calculable: false,
      orient: "vertical",
      right: WAVEFRONT_RIGHT_PADDING,
      top: WAVEFRONT_GRID_TOP,
      itemWidth: WAVEFRONT_VISUAL_MAP_WIDTH,
      itemHeight: visualMapHeight,
      formatter: formatWavefrontValue,
      text: [wavefrontMapData.unitZ, ""],
      textStyle: {
        color: textColor,
      },
      inRange: {
        color: ANALYSIS_HEATMAP_COLOR_PALETTE,
      },
    },
    series: [
      {
        type: "heatmap",
        data: heatmapData,
        progressive: 4096,
      },
    ],
  };
}
