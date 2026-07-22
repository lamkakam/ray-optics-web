/**
# `features/analysis/components/SpotDiagramChart/spotDiagramChartOption.ts`

## API

```ts
function buildSpotDiagramOption(
  spotDiagramData: SpotDiagramData,
  wavelengthLabels: readonly string[],
  chartWidth: number,
  chartHeight: number,
  textColor: string,
)
```
*/
import * as echarts from "echarts/core";
import { ScatterChart } from "echarts/charts";
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { ANALYSIS_HEATMAP_COLOR_PALETTE } from "@/features/analysis/lib/analysisChartPalette";
import { buildLegendWrapLayout } from "@/features/analysis/components/legendLayout";
import { formatPlotValue } from "@/shared/lib/chart-formatting/formatPlotValue";
import type { SpotDiagramData } from "@/features/analysis/types/plotData";

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

/**
## Purpose

Defines the Spot Diagram ECharts configuration used by `SpotDiagramChart`. This module owns ECharts registration, fixed layout constants, and conversion from worker-provided per-wavelength point clouds into labeled scatter series.

## Key Behaviors

- Registers the required ECharts scatter, grid, legend, tooltip, and canvas renderer modules once at module load.
- Builds one scatter series per wavelength group in `spotDiagramData`.
- Uses `wavelengthLabels[wvlIdx]` as the series and legend label so the UI shows the actual wavelength value rather than the wavelength index.
- Centers one-row wavelength legends over the usable plot band on wide charts.
- Bounds legends that need wrapping to the square-plot layout width and adds `24px` of top spacing per wrapped legend row before computing the square plot side.
- Applies the caller-provided `textColor` to legend labels, axis names, and axis tick labels so chart chrome follows the active light/dark theme.
- Parses numeric wavelength values from the labels and maps them to the nearest entry in `ANALYSIS_HEATMAP_COLOR_PALETTE`, using lower wavelengths for cooler colors and higher wavelengths for warmer colors.
- Falls back to a stable palette index when a series label does not contain a numeric wavelength.
- Uses symmetric axis extents across both axes based on the largest absolute `x` or `y` value across all wavelength groups, then rounds them with the shared analysis plot-value formatter before assigning them to ECharts.
- Formats visible x- and y-axis tick labels with the shared analysis plot-value formatter, including scientific notation for magnitudes between `1e-7` and `1e-4`.
- Keeps the plot area square by deriving `grid.width` and `grid.height` from the available measured space.
- Does not include a `visualMap`.
- Sets `tooltip.trigger` to `"none"` and `axisPointer.type` to `"cross"`.
- Uses point size `3` for all series.
*/
export function buildSpotDiagramOption(
  spotDiagramData: SpotDiagramData,
  wavelengthLabels: readonly string[],
  chartWidth: number,
  chartHeight: number,
  textColor: string,
) {
  const axisExtent = getAxisExtent(spotDiagramData);
  const legendData = spotDiagramData.map((seriesData) => getSeriesLabel(wavelengthLabels, seriesData.wvlIdx));
  const legendLayout = buildLegendWrapLayout(
    legendData,
    chartWidth,
    SPOT_DIAGRAM_GRID_LEFT,
    SPOT_DIAGRAM_GRID_RIGHT,
  );
  const gridTop = SPOT_DIAGRAM_GRID_TOP + legendLayout.extraTop;
  const maxPlotWidth = chartWidth - SPOT_DIAGRAM_GRID_LEFT - SPOT_DIAGRAM_GRID_RIGHT;
  const maxPlotHeight = chartHeight - gridTop - SPOT_DIAGRAM_GRID_BOTTOM;
  const plotSide = Math.max(0, Math.min(maxPlotWidth, maxPlotHeight));
  const extraHorizontalSpace = Math.max(0, maxPlotWidth - plotSide);
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
      left: legendLayout.left,
      right: legendLayout.right,
      data: legendData,
      textStyle: {
        color: textColor,
      },
    },
    grid: {
      left: SPOT_DIAGRAM_GRID_LEFT + extraHorizontalSpace / 2,
      right: SPOT_DIAGRAM_GRID_RIGHT - extraHorizontalSpace / 2,
      top: gridTop,
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
