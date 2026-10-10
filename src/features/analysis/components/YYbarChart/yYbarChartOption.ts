/** y-ȳ diagram ECharts registration and shared plot geometry. */
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { formatPlotValue } from "@/shared/lib/chart-formatting/formatPlotValue";
import type { YYbarData } from "@/features/analysis/types/plotData";

echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

const Y_YBAR_GRID_TOP = 32;
const Y_YBAR_GRID_BOTTOM = 56;
const Y_YBAR_GRID_LEFT = 72;
const Y_YBAR_GRID_RIGHT = 40;
const TOOLTIP_SIGNIFICANT_FIGURES = 6;
/** ECharts' marker for a missing value, which breaks the line into a gap. */
const MISSING_VALUE = "-";

/** Minimal ECharts callback parameter used by the label and tooltip formatters. */
interface PointParams {
  readonly dataIndex: number;
}

function withUnit(name: string, unit: string) {
  return unit ? `${name} (${unit})` : name;
}

function formatHeight(value: number | undefined, unit: string) {
  if (typeof value !== "number") return "n/a";
  const rounded = Number(value.toPrecision(TOOLTIP_SIGNIFICANT_FIGURES));
  return unit ? `${rounded} ${unit}` : `${rounded}`;
}

function surfaceName(label: string | undefined) {
  return label === "Obj" || label === "Img" ? label : `Surface ${label}`;
}

/**
 * Builds the Apache ECharts option for the paraxial y-ȳ (Delano) diagram.
 *
 * @remarks
 * - Plots chief-ray height ȳ on the value x-axis against marginal-ray height y on the value y-axis, both named with the system length unit.
 * - Draws one unsmoothed line series whose points follow sequential surface order, so ECharts joins the surfaces as a polyline; a non-numeric height becomes a gap.
 * - Labels each point with its surface label and shows the surface name with y and ȳ rounded to six significant figures in an item tooltip.
 */
export function buildYYbarChartOption(
  yYbarData: YYbarData,
  chartWidth: number,
  chartHeight: number,
  textColor: string,
) {
  const { surfaceLabels, y, yBar, unit } = yYbarData;
  const pointCount = Math.min(surfaceLabels.length, y.length, yBar.length);
  const lineData = Array.from({ length: pointCount }, (_, index) => [
    yBar[index] ?? MISSING_VALUE,
    y[index] ?? MISSING_VALUE,
  ]);
  const axisLabel = {
    color: textColor,
    formatter: (value: number) => formatPlotValue(value),
  };

  return {
    animation: false,
    tooltip: {
      trigger: "item",
      formatter: ({ dataIndex }: PointParams) =>
        `${surfaceName(surfaceLabels[dataIndex])}<br/>y: ${formatHeight(y[dataIndex], unit)}<br/>ȳ: ${formatHeight(yBar[dataIndex], unit)}`,
    },
    grid: {
      left: Y_YBAR_GRID_LEFT,
      right: Y_YBAR_GRID_RIGHT,
      top: Y_YBAR_GRID_TOP,
      bottom: Y_YBAR_GRID_BOTTOM,
      width: Math.max(0, chartWidth - Y_YBAR_GRID_LEFT - Y_YBAR_GRID_RIGHT),
      height: Math.max(0, chartHeight - Y_YBAR_GRID_TOP - Y_YBAR_GRID_BOTTOM),
    },
    xAxis: {
      type: "value",
      name: withUnit("ȳ", unit),
      nameLocation: "middle",
      nameGap: 30,
      nameTextStyle: { color: textColor },
      axisLabel,
    },
    yAxis: {
      type: "value",
      name: withUnit("y", unit),
      nameLocation: "middle",
      nameGap: 50,
      nameTextStyle: { color: textColor },
      axisLabel,
    },
    series: [
      {
        name: "y-ȳ",
        type: "line",
        smooth: false,
        showSymbol: true,
        data: lineData,
        label: {
          show: true,
          position: "top",
          color: textColor,
          formatter: ({ dataIndex }: PointParams) =>
            surfaceLabels[dataIndex] ?? "",
        },
      },
    ],
  };
}
