import * as echarts from "echarts/core";
import { ScatterChart } from "echarts/charts";
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { ANALYSIS_HEATMAP_COLOR_PALETTE } from "@/features/analysis/components/analysisChartPalette";
import { formatPlotValue } from "@/features/analysis/shared/formatPlotValue";
import type { SpotDiagramData } from "@/shared/lib/types/opticalModel";

echarts.use([ScatterChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

const SPOT_DIAGRAM_GRID_TOP = 48;
const SPOT_DIAGRAM_GRID_BOTTOM = 56;
const SPOT_DIAGRAM_GRID_LEFT = 72;
const SPOT_DIAGRAM_GRID_RIGHT = 32;
const SPOT_DIAGRAM_POINT_SIZE = 5;
const SPOT_DIAGRAM_POINT_OPACITY = 0.8;
function parseWavelengthLabel(wavelengthLabel: string | undefined): number | undefined {
  if (wavelengthLabel === undefined) return undefined;

  const matchedValue = wavelengthLabel.match(/-?\d+(?:\.\d+)?/);
  if (matchedValue === null) return undefined;

  const wavelength = Number.parseFloat(matchedValue[0]);
  return Number.isFinite(wavelength) ? wavelength : undefined;
}

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

function getSeriesColors(
  spotDiagramData: SpotDiagramData,
  wavelengthLabels: readonly string[],
): readonly string[] {
  const seriesWavelengths = spotDiagramData.map((seriesData) =>
    parseWavelengthLabel(wavelengthLabels[seriesData.wvlIdx]));
  const numericWavelengths = seriesWavelengths.filter((wavelength) => wavelength !== undefined);

  if (numericWavelengths.length === 0) {
    return spotDiagramData.map((_, index) =>
      ANALYSIS_HEATMAP_COLOR_PALETTE[index % ANALYSIS_HEATMAP_COLOR_PALETTE.length]);
  }

  const minWavelength = Math.min(...numericWavelengths);
  const maxWavelength = Math.max(...numericWavelengths);
  const paletteLastIndex = ANALYSIS_HEATMAP_COLOR_PALETTE.length - 1;

  if (minWavelength === maxWavelength) {
    const middleColor = ANALYSIS_HEATMAP_COLOR_PALETTE[Math.floor(paletteLastIndex / 2)];
    return spotDiagramData.map((_, index) =>
      seriesWavelengths[index] === undefined
        ? ANALYSIS_HEATMAP_COLOR_PALETTE[index % ANALYSIS_HEATMAP_COLOR_PALETTE.length]
        : middleColor);
  }

  return spotDiagramData.map((_, index) => {
    const wavelength = seriesWavelengths[index];
    if (wavelength === undefined) {
      return ANALYSIS_HEATMAP_COLOR_PALETTE[index % ANALYSIS_HEATMAP_COLOR_PALETTE.length];
    }

    const normalizedPosition = (wavelength - minWavelength) / (maxWavelength - minWavelength);
    const paletteIndex = Math.round(normalizedPosition * paletteLastIndex);
    return ANALYSIS_HEATMAP_COLOR_PALETTE[paletteIndex];
  });
}

export function buildSpotDiagramOption(
  spotDiagramData: SpotDiagramData,
  wavelengthLabels: readonly string[],
  chartWidth: number,
  chartHeight: number,
  textColor: string,
) {
  const axisExtent = getAxisExtent(spotDiagramData);
  const maxPlotWidth = chartWidth - SPOT_DIAGRAM_GRID_LEFT - SPOT_DIAGRAM_GRID_RIGHT;
  const maxPlotHeight = chartHeight - SPOT_DIAGRAM_GRID_TOP - SPOT_DIAGRAM_GRID_BOTTOM;
  const plotSide = Math.max(0, Math.min(maxPlotWidth, maxPlotHeight));
  const extraHorizontalSpace = Math.max(0, maxPlotWidth - plotSide);
  const legendData = spotDiagramData.map((seriesData) => getSeriesLabel(wavelengthLabels, seriesData.wvlIdx));
  const seriesColors = getSeriesColors(spotDiagramData, wavelengthLabels);

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
      textStyle: {
        color: textColor,
      },
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
      min: Number(formatPlotValue(-axisExtent)),
      max: Number(formatPlotValue(axisExtent)),
      name: spotDiagramData[0]?.unitX ? `x (${spotDiagramData[0].unitX})` : "x",
      nameLocation: "middle",
      nameGap: 30,
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
      min: Number(formatPlotValue(-axisExtent)),
      max: Number(formatPlotValue(axisExtent)),
      name: spotDiagramData[0]?.unitY ? `y (${spotDiagramData[0].unitY})` : "y",
      nameLocation: "middle",
      nameGap: 36,
      nameTextStyle: {
        color: textColor,
      },
      axisLabel: {
        color: textColor,
        formatter: (value: number) => formatPlotValue(value),
      },
    },
    series: spotDiagramData.map((seriesData, index) => ({
      type: "scatter",
      name: getSeriesLabel(wavelengthLabels, seriesData.wvlIdx),
      data: seriesData.x.map((x, pointIndex) => [x, seriesData.y[pointIndex] ?? 0]),
      symbolSize: SPOT_DIAGRAM_POINT_SIZE,
      itemStyle: {
        color: seriesColors[index],
        opacity: SPOT_DIAGRAM_POINT_OPACITY,
      },
      progressive: 4096,
    })),
  };
}
