import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import { GridComponent, LegendComponent, TitleComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { ANALYSIS_HEATMAP_COLOR_PALETTE } from "@/features/analysis/lib/analysisChartPalette";
import { buildLegendWrapLayout } from "@/features/analysis/components/legendLayout";
import { formatPlotValue } from "@/shared/lib/chart-formatting/formatPlotValue";
import type { RayFanData } from "@/features/analysis/types/plotData";

echarts.use([LineChart, GridComponent, LegendComponent, TitleComponent, TooltipComponent, CanvasRenderer]);

const RAY_FAN_GRID_TOP = 72;
const RAY_FAN_GRID_BOTTOM = 52;
const RAY_FAN_GRID_LEFT = 60;
const RAY_FAN_GRID_RIGHT = 28;
const RAY_FAN_GRID_GAP = 48;
const RAY_FAN_STACKED_GRID_GAP = 104;
const RAY_FAN_STACKED_TITLE_OFFSET = 32;
const RAY_FAN_TITLE_TOP = 40;
const RAY_FAN_LEGEND_TOP = 12;
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
  rayFanData: RayFanData,
  wavelengthLabels: readonly string[],
): readonly string[] {
  const seriesWavelengths = rayFanData.map((seriesData) =>
    parseWavelengthLabel(wavelengthLabels[seriesData.wvlIdx]));
  const numericWavelengths = seriesWavelengths.filter((wavelength) => wavelength !== undefined);

  if (numericWavelengths.length === 0) {
    return rayFanData.map((_, index) =>
      ANALYSIS_HEATMAP_COLOR_PALETTE[index % ANALYSIS_HEATMAP_COLOR_PALETTE.length]);
  }

  const minWavelength = Math.min(...numericWavelengths);
  const maxWavelength = Math.max(...numericWavelengths);
  const paletteLastIndex = ANALYSIS_HEATMAP_COLOR_PALETTE.length - 1;

  if (minWavelength === maxWavelength) {
    const middleColor = ANALYSIS_HEATMAP_COLOR_PALETTE[Math.floor(paletteLastIndex / 2)];
    return rayFanData.map((_, index) =>
      seriesWavelengths[index] === undefined
        ? ANALYSIS_HEATMAP_COLOR_PALETTE[index % ANALYSIS_HEATMAP_COLOR_PALETTE.length]
        : middleColor);
  }

  return rayFanData.map((_, index) => {
    const wavelength = seriesWavelengths[index];
    if (wavelength === undefined) {
      return ANALYSIS_HEATMAP_COLOR_PALETTE[index % ANALYSIS_HEATMAP_COLOR_PALETTE.length];
    }

    const normalizedPosition = (wavelength - minWavelength) / (maxWavelength - minWavelength);
    const paletteIndex = Math.round(normalizedPosition * paletteLastIndex);
    return ANALYSIS_HEATMAP_COLOR_PALETTE[paletteIndex];
  });
}

interface RayFanAxisExtents {
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

function formatSeriesPoint(x: number, y: number | undefined): [number, number | null] {
  return [x, y === undefined ? null : y];
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

function getAxisExtents(rayFanData: RayFanData): RayFanAxisExtents {
  let xMin = Number.POSITIVE_INFINITY;
  let xMax = Number.NEGATIVE_INFINITY;
  let tangentialYMin = Number.POSITIVE_INFINITY;
  let tangentialYMax = Number.NEGATIVE_INFINITY;
  let sagittalYMin = Number.POSITIVE_INFINITY;
  let sagittalYMax = Number.NEGATIVE_INFINITY;

  for (const seriesData of rayFanData) {
    for (const axisData of [seriesData.Tangential, seriesData.Sagittal]) {
      for (const x of axisData.x) {
        if (Number.isFinite(x)) {
          xMin = Math.min(xMin, x);
          xMax = Math.max(xMax, x);
        }
      }
    }

    for (const y of seriesData.Tangential.y) {
      if (typeof y === "number" && Number.isFinite(y)) {
        tangentialYMin = Math.min(tangentialYMin, y);
        tangentialYMax = Math.max(tangentialYMax, y);
      }
    }

    for (const y of seriesData.Sagittal.y) {
      if (typeof y === "number" && Number.isFinite(y)) {
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

/**
 * Defines the Ray Fan ECharts configuration used by `RayFanChart`. This module owns ECharts registration, fixed layout constants, wavelength-based color assignment, and conversion from worker-provided ray-fan data into paired tangential/sagittal line series.
 *
 * @remarks
 * ## Key Behaviors
 *
 * - Registers the required ECharts line, grid, legend, title, tooltip, and canvas renderer modules once at module load.
 * - Produces two grids with titles `Tangential` and `Sagittal`.
 * - Defaults to the existing large-screen side-by-side layout.
 * - When `isSmallScreen` is `true`, uses full-width stacked grids with `Tangential` above `Sagittal` and extra inter-plot space so the Tangential x-axis name does not overlap the Sagittal title.
 * - Uses one shared legend entry per wavelength; both subplot series for a wavelength share the same label and color.
 * - Centers one-row wavelength legends over the usable plot band on wide charts.
 * - Bounds legends that need wrapping to the plot width and adds `24px` of top spacing per wrapped legend row so multi-wavelength legends do not overlap subplot titles or grids on narrow charts.
 * - Applies the caller-provided `textColor` to subplot titles, legend labels, axis names, and axis tick labels so chart chrome follows the active light/dark theme.
 * - Formats visible x- and y-axis tick labels with the shared analysis plot-value formatter, including scientific notation for magnitudes between `1e-7` and `1e-4`.
 * - Sets `tooltip.trigger` to `"none"` and `tooltip.axisPointer.type` to `"cross"`.
 * - Sets `showSymbol: false` on every line series.
 * - Converts `undefined` fan ordinates to ECharts `null` points so aperture-blocked samples render as visible line gaps instead of zero-valued points.
 * - Parses numeric wavelengths from UI labels so lower/higher wavelengths map consistently onto `ANALYSIS_HEATMAP_COLOR_PALETTE`.
 * - Falls back to stable palette ordering when a wavelength label is not numeric.
 * - Computes one shared x-axis min/max extent from both subplots and assigns it to both x axes.
 * - Computes independent y-axis min/max extents for Tangential and Sagittal data, assigns them to their matching subplots, and does not expose a UI toggle for shared y scaling.
 * - Rounds computed axis min/max extents with the shared analysis plot-value formatter before assigning them to subplots, including clamping magnitudes smaller than `1e-9` to `0`.
 * - Falls back to `[-1e-6, 1e-6]` for a subplot's y-axis extent when that subplot has no finite y values or only one constant finite y value.
 * - Labels only the first y-axis. `arcsec` payloads use `Angular Aberr. (arcsec)`; finite transverse payloads retain `Transverse Aberr. (${unitY})`.
 *
 *
 *
 * ## Output Shape
 *
 * - `title`: two subplot titles
 * - `grid`: two plotting regions
 * - `xAxis`: paired `value` axes labeled `Pupil Radius (Relative)`
 * - `yAxis`: paired `value` axes, with the first labeled `Transverse Aberr. (...)` and the second left unlabeled
 * - `series`: two line series per wavelength, tangential first then sagittal
 */
export function buildRayFanChartOption(
  rayFanData: RayFanData,
  wavelengthLabels: readonly string[],
  chartWidth: number,
  chartHeight: number,
  textColor: string,
  isSmallScreen = false,
) {
  const legendData = rayFanData.map((seriesData) => getSeriesLabel(wavelengthLabels, seriesData.wvlIdx));
  const legendLayout = buildLegendWrapLayout(
    legendData,
    chartWidth,
    RAY_FAN_GRID_LEFT,
    RAY_FAN_GRID_RIGHT,
  );
  const gridTop = RAY_FAN_GRID_TOP + legendLayout.extraTop;
  const titleTop = RAY_FAN_TITLE_TOP + legendLayout.extraTop;
  const sideBySideSubplotWidth = Math.max(
    0,
    (chartWidth - RAY_FAN_GRID_LEFT - RAY_FAN_GRID_RIGHT - RAY_FAN_GRID_GAP) / 2,
  );
  const sideBySideSubplotHeight = Math.max(0, chartHeight - gridTop - RAY_FAN_GRID_BOTTOM);
  const stackedSubplotWidth = Math.max(0, chartWidth - RAY_FAN_GRID_LEFT - RAY_FAN_GRID_RIGHT);
  const stackedSubplotHeight = Math.max(
    0,
    (chartHeight - gridTop - RAY_FAN_GRID_BOTTOM - RAY_FAN_STACKED_GRID_GAP) / 2,
  );
  const subplotWidth = isSmallScreen ? stackedSubplotWidth : sideBySideSubplotWidth;
  const subplotHeight = isSmallScreen ? stackedSubplotHeight : sideBySideSubplotHeight;
  const tangentialGridLeft = RAY_FAN_GRID_LEFT;
  const tangentialGridTop = gridTop;
  const sagittalGridLeft = isSmallScreen
    ? RAY_FAN_GRID_LEFT
    : RAY_FAN_GRID_LEFT + subplotWidth + RAY_FAN_GRID_GAP;
  const sagittalGridTop = isSmallScreen
    ? gridTop + subplotHeight + RAY_FAN_STACKED_GRID_GAP
    : gridTop;
  const tangentialTitleTop = titleTop;
  const sagittalTitleTop = isSmallScreen
    ? sagittalGridTop - RAY_FAN_STACKED_TITLE_OFFSET
    : titleTop;
  const axisExtents = getAxisExtents(rayFanData);
  const seriesColors = getSeriesColors(rayFanData, wavelengthLabels);
  const rayFanUnit = rayFanData[0]?.unitY;
  const yAxisName = rayFanUnit === "arcsec"
    ? "Angular Aberr. (arcsec)"
    : rayFanUnit ? `Transverse Aberr. (${rayFanUnit})` : "Transverse Aberr.";

  return {
    animation: false,
    tooltip: {
      trigger: "none",
      axisPointer: {
        type: "cross",
      },
    },
    legend: {
      top: RAY_FAN_LEGEND_TOP,
      left: legendLayout.left,
      right: legendLayout.right,
      data: legendData,
      textStyle: {
        color: textColor,
      },
    },
    title: [
      {
        text: "Tangential",
        top: tangentialTitleTop,
        left: tangentialGridLeft + subplotWidth / 2,
        textAlign: "center",
        textStyle: {
          color: textColor,
        },
      },
      {
        text: "Sagittal",
        top: sagittalTitleTop,
        left: sagittalGridLeft + subplotWidth / 2,
        textAlign: "center",
        textStyle: {
          color: textColor,
        },
      },
    ],
    grid: [
      {
        left: tangentialGridLeft,
        top: tangentialGridTop,
        width: subplotWidth,
        height: subplotHeight,
      },
      {
        left: sagittalGridLeft,
        top: sagittalGridTop,
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
          formatter: (value: number) => formatPlotValue(value),
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
          formatter: (value: number) => formatPlotValue(value),
        },
      },
    ],
    yAxis: [
      {
        type: "value",
        min: axisExtents.tangentialYMin,
        max: axisExtents.tangentialYMax,
        name: yAxisName,
        nameLocation: "middle",
        nameGap: 42,
        gridIndex: 0,
        nameTextStyle: {
          color: textColor,
        },
        axisLabel: {
          color: textColor,
          formatter: (value: number) => formatPlotValue(value),
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
          formatter: (value: number) => formatPlotValue(value),
        },
      },
    ],
    series: rayFanData.flatMap((seriesData, index) => {
      const seriesLabel = getSeriesLabel(wavelengthLabels, seriesData.wvlIdx);
      const color = seriesColors[index];

      return [
        {
          type: "line",
          name: seriesLabel,
          xAxisIndex: 0,
          yAxisIndex: 0,
          showSymbol: false,
          data: seriesData.Tangential.x.map((x, pointIndex) => formatSeriesPoint(x, seriesData.Tangential.y[pointIndex])),
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
          data: seriesData.Sagittal.x.map((x, pointIndex) => formatSeriesPoint(x, seriesData.Sagittal.y[pointIndex])),
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
