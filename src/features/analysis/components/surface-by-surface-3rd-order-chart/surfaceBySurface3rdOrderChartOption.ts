import * as echarts from "echarts/core";
import { BarChart } from "echarts/charts";
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { formatPlotValue } from "@/features/analysis/shared/formatPlotValue";
import type { SeidelSurfaceBySurfaceData } from "@/shared/lib/types/opticalModel";

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
