import * as echarts from "echarts/core";
import { BarChart } from "echarts/charts";
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { formatPlotValue } from "@/shared/lib/chart-formatting/formatPlotValue";
import type { SeidelSurfaceBySurfaceData } from "@/features/lens-editor/types/seidelData";

echarts.use([BarChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

const SURFACE_BY_SURFACE_GRID_TOP = 72;
const SURFACE_BY_SURFACE_GRID_BOTTOM = 56;
const SURFACE_BY_SURFACE_GRID_LEFT = 64;
const SURFACE_BY_SURFACE_GRID_RIGHT = 28;
const SURFACE_BY_SURFACE_LEGEND_TOP = 12;
const SURFACE_BY_SURFACE_BAR_CATEGORY_GAP = "60%";

type TooltipFormatterParam = {
  readonly axisValueLabel?: string;
  readonly seriesName?: string;
  readonly value?: number | string | Array<number | string>;
  readonly marker?: string;
};

function formatTooltipValue(value: TooltipFormatterParam["value"]) {
  if (typeof value === "number") {
    return formatPlotValue(value);
  }

  if (typeof value === "string") {
    const parsedValue = Number(value);
    return Number.isNaN(parsedValue) ? value : formatPlotValue(parsedValue);
  }

  if (Array.isArray(value)) {
    const lastValue = value.at(-1);
    if (typeof lastValue === "number") {
      return formatPlotValue(lastValue);
    }

    if (typeof lastValue === "string") {
      const parsedValue = Number(lastValue);
      return Number.isNaN(parsedValue) ? lastValue : formatPlotValue(parsedValue);
    }
  }

  return "";
}

function formatTooltip(params: TooltipFormatterParam | TooltipFormatterParam[]) {
  const tooltipParams = Array.isArray(params) ? params : [params];
  const [firstParam] = tooltipParams;
  const axisValueLabel = firstParam?.axisValueLabel ?? "";

  return [
    axisValueLabel,
    ...tooltipParams.map((param) =>
      `${param.marker ?? ""}${param.seriesName ?? ""}: ${formatTooltipValue(param.value)}`,
    ),
  ].join("<br/>");
}

/**
Builds the ECharts option object for the analysis panel’s grouped bar chart of surface-by-surface third-order Seidel aberration coefficients.

## Key Behaviors

- Registers the required ECharts modules: `BarChart`, `GridComponent`, `LegendComponent`, `TooltipComponent`, and `CanvasRenderer`.
- Uses the incoming `aberrTypes` array directly as:
  - the legend data
  - the series names
- Uses the incoming `surfaceLabels` array as the x-axis categories.
- Builds five bar series from `data[rowIdx]`, matching the row-wise `SeidelSurfaceBySurfaceData` contract.
- Configures the tooltip with:
  - `trigger: "axis"`
  - `axisPointer: { type: "shadow" }`
  - a shared analysis plot-value formatter that renders tooltip numeric values with 2 significant figures and clamps magnitudes smaller than `1e-7` to `0`
- Increases the inter-category spacing between grouped bar clusters by setting each bar series `barCategoryGap` to `"60%"`.
- Formats y-axis tick labels with the shared analysis plot-value formatter.
- Does not render a chart title.
- Applies the caller-provided `textColor` to legend labels, axis names, and axis tick labels so chart chrome follows the active light/dark theme.
- Does not override series colors, so ECharts’ default palette supplies the distinct legend/series colors.
*/
export function buildSurfaceBySurface3rdOrderChartOption(
  surfaceBySurface3rdOrderData: SeidelSurfaceBySurfaceData,
  chartWidth: number,
  chartHeight: number,
  textColor: string,
) {
  return {
    animation: false,
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "shadow",
      },
      formatter: formatTooltip,
    },
    legend: {
      top: SURFACE_BY_SURFACE_LEGEND_TOP,
      data: surfaceBySurface3rdOrderData.aberrTypes,
      textStyle: {
        color: textColor,
      },
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
      nameTextStyle: {
        color: textColor,
      },
      axisLabel: {
        color: textColor,
      },
    },
    yAxis: {
      type: "value",
      name: "3rd Order Aberrations",
      nameLocation: "middle",
      nameGap: 48,
      nameTextStyle: {
        color: textColor,
      },
      axisLabel: {
        color: textColor,
        formatter: (value: number) => formatPlotValue(value),
      },
    },
    series: surfaceBySurface3rdOrderData.aberrTypes.map((aberrationType, rowIndex) => ({
      type: "bar",
      name: aberrationType,
      barCategoryGap: SURFACE_BY_SURFACE_BAR_CATEGORY_GAP,
      emphasis: {
        focus: "series",
      },
      data: surfaceBySurface3rdOrderData.data[rowIndex] ?? [],
    })),
  };
}
