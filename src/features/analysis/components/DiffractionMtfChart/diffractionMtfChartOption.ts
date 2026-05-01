import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { formatPlotValue } from "@/shared/lib/chart-formatting/formatPlotValue";
import type { DiffractionMtfData, LineAxisData } from "@/features/analysis/types/plotData";

echarts.use([LineChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

const DIFFRACTION_MTF_GRID_TOP = 48;
const DIFFRACTION_MTF_GRID_BOTTOM = 56;
const DIFFRACTION_MTF_GRID_LEFT = 64;
const DIFFRACTION_MTF_GRID_RIGHT = 28;
const DIFFRACTION_MTF_LEGEND_TOP = 12;

interface DiffractionMtfSeriesConfig {
  readonly key: keyof Pick<DiffractionMtfData, "Tangential" | "Sagittal" | "IdealTangential" | "IdealSagittal">;
  readonly label: string;
  readonly lineType: "solid" | "dashed";
}

const SERIES_CONFIG: readonly DiffractionMtfSeriesConfig[] = [
  { key: "Tangential", label: "Tangential", lineType: "solid" },
  { key: "Sagittal", label: "Sagittal", lineType: "solid" },
  { key: "IdealTangential", label: "IdealTangential", lineType: "dashed" },
  { key: "IdealSagittal", label: "IdealSagittal", lineType: "dashed" },
];

function toLineData(axisData: LineAxisData): number[][] {
  const pointCount = Math.min(axisData.x.length, axisData.y.length);
  const lineData: number[][] = [];

  for (let index = 0; index < pointCount; index += 1) {
    lineData.push([axisData.x[index], axisData.y[index]]);
  }

  return lineData;
}

function getXAxisMax(diffractionMtfData: DiffractionMtfData): number {
  let max = 0;
  for (const seriesConfig of SERIES_CONFIG) {
    for (const x of diffractionMtfData[seriesConfig.key].x) {
      max = Math.max(max, x);
    }
  }
  return Number(formatPlotValue(max));
}

function getYAxisMax(diffractionMtfData: DiffractionMtfData): number {
  let max = 1;
  for (const seriesConfig of SERIES_CONFIG) {
    for (const y of diffractionMtfData[seriesConfig.key].y) {
      max = Math.max(max, y);
    }
  }
  return Number(formatPlotValue(max));
}

export function buildDiffractionMtfOption(
  diffractionMtfData: DiffractionMtfData,
  chartWidth: number,
  chartHeight: number,
  textColor: string,
) {
  return {
    animation: false,
    tooltip: {
      trigger: "none",
      axisPointer: {
        type: "cross",
      },
    },
    legend: {
      top: DIFFRACTION_MTF_LEGEND_TOP,
      data: SERIES_CONFIG.map((seriesConfig) => seriesConfig.label),
      textStyle: {
        color: textColor,
      },
    },
    grid: {
      left: DIFFRACTION_MTF_GRID_LEFT,
      right: DIFFRACTION_MTF_GRID_RIGHT,
      top: DIFFRACTION_MTF_GRID_TOP,
      bottom: DIFFRACTION_MTF_GRID_BOTTOM,
      width: Math.max(0, chartWidth - DIFFRACTION_MTF_GRID_LEFT - DIFFRACTION_MTF_GRID_RIGHT),
      height: Math.max(0, chartHeight - DIFFRACTION_MTF_GRID_TOP - DIFFRACTION_MTF_GRID_BOTTOM),
    },
    xAxis: {
      type: "value",
      min: 0,
      max: getXAxisMax(diffractionMtfData),
      name: diffractionMtfData.unitX ? `Spatial Frequency (${diffractionMtfData.unitX})` : "Spatial Frequency",
      nameLocation: "middle",
      nameGap: 34,
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
      min: 0,
      max: getYAxisMax(diffractionMtfData),
      name: "MTF",
      nameLocation: "middle",
      nameGap: 42,
      nameTextStyle: {
        color: textColor,
      },
      axisLabel: {
        color: textColor,
        formatter: (value: number) => formatPlotValue(value),
      },
    },
    series: SERIES_CONFIG.map((seriesConfig) => ({
      name: seriesConfig.label,
      type: "line",
      data: toLineData(diffractionMtfData[seriesConfig.key]),
      showSymbol: false,
      lineStyle: {
        type: seriesConfig.lineType,
        width: 2,
      },
    })),
  };
}
