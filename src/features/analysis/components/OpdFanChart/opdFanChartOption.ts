import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import { GridComponent, LegendComponent, TitleComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { ANALYSIS_HEATMAP_COLOR_PALETTE } from "@/features/analysis/lib/analysisChartPalette";
import { formatPlotValue } from "@/shared/lib/chart-formatting/formatPlotValue";
import type { OpdFanData } from "@/features/analysis/types/plotData";

echarts.use([LineChart, GridComponent, LegendComponent, TitleComponent, TooltipComponent, CanvasRenderer]);

const OPD_FAN_GRID_TOP = 72;
const OPD_FAN_GRID_BOTTOM = 52;
const OPD_FAN_GRID_LEFT = 60;
const OPD_FAN_GRID_RIGHT = 28;
const OPD_FAN_GRID_GAP = 48;
const OPD_FAN_TITLE_TOP = 40;
const OPD_FAN_LEGEND_TOP = 12;
function formatOpdFanAxisTick(value: number): string {
  return formatPlotValue(value);
}

function parseWavelengthLabel(wavelengthLabel: string | undefined): number | undefined {
  if (wavelengthLabel === undefined) return undefined;

  const matchedValue = wavelengthLabel.match(/-?\d+(?:\.\d+)?/);
  if (matchedValue === null) return undefined;

  const wavelength = Number.parseFloat(matchedValue[0]);
  return Number.isFinite(wavelength) ? wavelength : undefined;
}

function getSeriesLabel(wavelengthLabels: readonly string[], wvlIdx: number): string {
  return wavelengthLabels[wvlIdx] ?? `Wavelength ${wvlIdx}`;
}

function getSeriesColors(
  opdFanData: OpdFanData,
  wavelengthLabels: readonly string[],
): readonly string[] {
  const seriesWavelengths = opdFanData.map((seriesData) =>
    parseWavelengthLabel(wavelengthLabels[seriesData.wvlIdx]));
  const numericWavelengths = seriesWavelengths.filter((wavelength) => wavelength !== undefined);

  if (numericWavelengths.length === 0) {
    return opdFanData.map((_, index) =>
      ANALYSIS_HEATMAP_COLOR_PALETTE[index % ANALYSIS_HEATMAP_COLOR_PALETTE.length]);
  }

  const minWavelength = Math.min(...numericWavelengths);
  const maxWavelength = Math.max(...numericWavelengths);
  const paletteLastIndex = ANALYSIS_HEATMAP_COLOR_PALETTE.length - 1;

  if (minWavelength === maxWavelength) {
    const middleColor = ANALYSIS_HEATMAP_COLOR_PALETTE[Math.floor(paletteLastIndex / 2)];
    return opdFanData.map((_, index) =>
      seriesWavelengths[index] === undefined
        ? ANALYSIS_HEATMAP_COLOR_PALETTE[index % ANALYSIS_HEATMAP_COLOR_PALETTE.length]
        : middleColor);
  }

  return opdFanData.map((_, index) => {
    const wavelength = seriesWavelengths[index];
    if (wavelength === undefined) {
      return ANALYSIS_HEATMAP_COLOR_PALETTE[index % ANALYSIS_HEATMAP_COLOR_PALETTE.length];
    }

    const normalizedPosition = (wavelength - minWavelength) / (maxWavelength - minWavelength);
    const paletteIndex = Math.round(normalizedPosition * paletteLastIndex);
    return ANALYSIS_HEATMAP_COLOR_PALETTE[paletteIndex];
  });
}

interface OpdFanAxisExtents {
  readonly xMin: number;
  readonly xMax: number;
  readonly tangentialYMin: number;
  readonly tangentialYMax: number;
  readonly sagittalYMin: number;
  readonly sagittalYMax: number;
}

function formatAxisExtent(value: number): number {
  return Number(formatPlotValue(value));
}

function formatYExtents(yMin: number, yMax: number): { readonly yMin: number; readonly yMax: number } {
  if (!Number.isFinite(yMin) || !Number.isFinite(yMax) || yMin === yMax) {
    return {
      yMin: formatAxisExtent(-1e-6),
      yMax: formatAxisExtent(1e-6),
    };
  }

  return {
    yMin: formatAxisExtent(yMin),
    yMax: formatAxisExtent(yMax),
  };
}

function getAxisExtents(opdFanData: OpdFanData): OpdFanAxisExtents {
  let xMin = Number.POSITIVE_INFINITY;
  let xMax = Number.NEGATIVE_INFINITY;
  let tangentialYMin = Number.POSITIVE_INFINITY;
  let tangentialYMax = Number.NEGATIVE_INFINITY;
  let sagittalYMin = Number.POSITIVE_INFINITY;
  let sagittalYMax = Number.NEGATIVE_INFINITY;

  for (const seriesData of opdFanData) {
    for (const axisData of [seriesData.Tangential, seriesData.Sagittal]) {
      for (const x of axisData.x) {
        if (Number.isFinite(x)) {
          xMin = Math.min(xMin, x);
          xMax = Math.max(xMax, x);
        }
      }
    }

    for (const y of seriesData.Tangential.y) {
      if (Number.isFinite(y)) {
        tangentialYMin = Math.min(tangentialYMin, y);
        tangentialYMax = Math.max(tangentialYMax, y);
      }
    }

    for (const y of seriesData.Sagittal.y) {
      if (Number.isFinite(y)) {
        sagittalYMin = Math.min(sagittalYMin, y);
        sagittalYMax = Math.max(sagittalYMax, y);
      }
    }
  }

  if (!Number.isFinite(xMin) || !Number.isFinite(xMax)) {
    xMin = -1;
    xMax = 1;
  }

  const tangentialYExtents = formatYExtents(tangentialYMin, tangentialYMax);
  const sagittalYExtents = formatYExtents(sagittalYMin, sagittalYMax);

  return {
    xMin: formatAxisExtent(xMin),
    xMax: formatAxisExtent(xMax),
    tangentialYMin: tangentialYExtents.yMin,
    tangentialYMax: tangentialYExtents.yMax,
    sagittalYMin: sagittalYExtents.yMin,
    sagittalYMax: sagittalYExtents.yMax,
  };
}

export function buildOpdFanChartOption(
  opdFanData: OpdFanData,
  wavelengthLabels: readonly string[],
  chartWidth: number,
  chartHeight: number,
  textColor: string,
) {
  const subplotWidth = Math.max(
    0,
    (chartWidth - OPD_FAN_GRID_LEFT - OPD_FAN_GRID_RIGHT - OPD_FAN_GRID_GAP) / 2,
  );
  const subplotHeight = Math.max(0, chartHeight - OPD_FAN_GRID_TOP - OPD_FAN_GRID_BOTTOM);
  const axisExtents = getAxisExtents(opdFanData);
  const legendData = opdFanData.map((seriesData) => getSeriesLabel(wavelengthLabels, seriesData.wvlIdx));
  const seriesColors = getSeriesColors(opdFanData, wavelengthLabels);

  return {
    animation: false,
    tooltip: {
      trigger: "none",
      axisPointer: {
        type: "cross",
      },
    },
    legend: {
      top: OPD_FAN_LEGEND_TOP,
      data: legendData,
      textStyle: {
        color: textColor,
      },
    },
    title: [
      {
        text: "Tangential",
        top: OPD_FAN_TITLE_TOP,
        left: OPD_FAN_GRID_LEFT + subplotWidth / 2,
        textAlign: "center",
        textStyle: {
          color: textColor,
        },
      },
      {
        text: "Sagittal",
        top: OPD_FAN_TITLE_TOP,
        left: OPD_FAN_GRID_LEFT + subplotWidth + OPD_FAN_GRID_GAP + subplotWidth / 2,
        textAlign: "center",
        textStyle: {
          color: textColor,
        },
      },
    ],
    grid: [
      {
        left: OPD_FAN_GRID_LEFT,
        top: OPD_FAN_GRID_TOP,
        width: subplotWidth,
        height: subplotHeight,
      },
      {
        left: OPD_FAN_GRID_LEFT + subplotWidth + OPD_FAN_GRID_GAP,
        top: OPD_FAN_GRID_TOP,
        width: subplotWidth,
        height: subplotHeight,
      },
    ],
    xAxis: [
      {
        type: "value",
        min: axisExtents.xMin,
        max: axisExtents.xMax,
        name: "Pupil Radius (Relative)",
        nameLocation: "middle",
        nameGap: 28,
        gridIndex: 0,
        nameTextStyle: {
          color: textColor,
        },
        axisLabel: {
          color: textColor,
        },
      },
      {
        type: "value",
        min: axisExtents.xMin,
        max: axisExtents.xMax,
        name: "Pupil Radius (Relative)",
        nameLocation: "middle",
        nameGap: 28,
        gridIndex: 1,
        nameTextStyle: {
          color: textColor,
        },
        axisLabel: {
          color: textColor,
        },
      },
    ],
    yAxis: [
      {
        type: "value",
        min: axisExtents.tangentialYMin,
        max: axisExtents.tangentialYMax,
        name: opdFanData[0]?.unitY ?? "waves",
        nameLocation: "middle",
        nameGap: 42,
        gridIndex: 0,
        nameTextStyle: {
          color: textColor,
        },
        axisLabel: {
          color: textColor,
          formatter: formatOpdFanAxisTick,
        },
      },
      {
        type: "value",
        min: axisExtents.sagittalYMin,
        max: axisExtents.sagittalYMax,
        name: "",
        nameLocation: "middle",
        nameGap: 42,
        gridIndex: 1,
        nameTextStyle: {
          color: textColor,
        },
        axisLabel: {
          color: textColor,
          formatter: formatOpdFanAxisTick,
        },
      },
    ],
    series: opdFanData.flatMap((seriesData, index) => {
      const seriesLabel = getSeriesLabel(wavelengthLabels, seriesData.wvlIdx);
      const color = seriesColors[index];

      return [
        {
          type: "line",
          name: seriesLabel,
          xAxisIndex: 0,
          yAxisIndex: 0,
          showSymbol: false,
          data: seriesData.Tangential.x.map((x, pointIndex) => [x, seriesData.Tangential.y[pointIndex] ?? 0]),
          lineStyle: {
            color,
          },
          itemStyle: {
            color,
          },
        },
        {
          type: "line",
          name: seriesLabel,
          xAxisIndex: 1,
          yAxisIndex: 1,
          showSymbol: false,
          data: seriesData.Sagittal.x.map((x, pointIndex) => [x, seriesData.Sagittal.y[pointIndex] ?? 0]),
          lineStyle: {
            color,
          },
          itemStyle: {
            color,
          },
        },
      ];
    }),
  };
}
