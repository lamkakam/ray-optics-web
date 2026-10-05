/** Chromatic-focal-shift ECharts registration and shared plot geometry. */
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import {
  GridComponent,
  TitleComponent,
  TooltipComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { formatPlotValue } from "@/shared/lib/chart-formatting/formatPlotValue";
import type { ChromaticFocalShiftData } from "@/features/analysis/types/plotData";

echarts.use([
  LineChart,
  GridComponent,
  TitleComponent,
  TooltipComponent,
  CanvasRenderer,
]);

const CHROMATIC_FOCAL_SHIFT_GRID_TOP = 24;
const CHROMATIC_FOCAL_SHIFT_GRID_BOTTOM = 80;
const CHROMATIC_FOCAL_SHIFT_GRID_LEFT = 72;
const CHROMATIC_FOCAL_SHIFT_GRID_RIGHT = 28;
const REFERENCE_LINE_COLOR = "#9ca3af";
/** ECharts' marker for a missing value, which breaks the line into a gap. */
const MISSING_VALUE = "-";

function toLineData(
  chromaticFocalShiftData: ChromaticFocalShiftData,
): (number | typeof MISSING_VALUE)[][] {
  const pointCount = Math.min(
    chromaticFocalShiftData.x.length,
    chromaticFocalShiftData.y.length,
  );
  const lineData: (number | typeof MISSING_VALUE)[][] = [];

  for (let index = 0; index < pointCount; index += 1) {
    const shift = chromaticFocalShiftData.x[index];
    lineData.push([
      typeof shift === "number" ? shift : MISSING_VALUE,
      chromaticFocalShiftData.y[index],
    ]);
  }

  return lineData;
}

function formatSummaryNumber(value: number, significantFigures: number) {
  return Number(value.toPrecision(significantFigures)).toString();
}

function buildSummary(chromaticFocalShiftData: ChromaticFocalShiftData) {
  const { referenceWavelength, maxFocalShiftRange, unitX, unitY } =
    chromaticFocalShiftData;
  const reference = `${Number(referenceWavelength.toFixed(3))} ${unitY}`;
  const range =
    typeof maxFocalShiftRange === "number"
      ? `${formatSummaryNumber(maxFocalShiftRange, 4)} ${unitX}`
      : "n/a";
  return `Reference wavelength: ${reference} · Max. focal shift range: ${range}`;
}

/**
 * Builds the Apache ECharts option for the chromatic-focal-shift line chart.
 *
 * @remarks
 * - Plots focal shift on the value x-axis against wavelength on the y-axis, pinned to the sampled endpoints.
 * - Names the x-axis `Focal Shift (<unit>)`, or `Output Vergence Shift (D)` for afocal `D` payloads.
 * - Draws the symbol-free focal-shift series in sample order; failed (`undefined` or JSON `null`) samples become gaps.
 * - Adds a silent dashed vertical line at zero shift, where the curve meets the reference wavelength.
 * - Shows a bottom title with the reference wavelength (up to three decimals) and the maximum focal shift range (four significant figures, or `n/a`).
 */
export function buildChromaticFocalShiftOption(
  chromaticFocalShiftData: ChromaticFocalShiftData,
  chartWidth: number,
  chartHeight: number,
  textColor: string,
) {
  const { unitX, unitY, y } = chromaticFocalShiftData;
  const yAxisMin = y[0];
  const yAxisMax = y[y.length - 1];

  return {
    animation: false,
    tooltip: {
      trigger: "none",
      axisPointer: {
        type: "cross",
      },
    },
    title: {
      text: buildSummary(chromaticFocalShiftData),
      left: "center",
      bottom: 4,
      textStyle: {
        color: textColor,
        fontSize: 12,
        fontWeight: "normal",
      },
    },
    grid: {
      left: CHROMATIC_FOCAL_SHIFT_GRID_LEFT,
      right: CHROMATIC_FOCAL_SHIFT_GRID_RIGHT,
      top: CHROMATIC_FOCAL_SHIFT_GRID_TOP,
      bottom: CHROMATIC_FOCAL_SHIFT_GRID_BOTTOM,
      width: Math.max(
        0,
        chartWidth -
          CHROMATIC_FOCAL_SHIFT_GRID_LEFT -
          CHROMATIC_FOCAL_SHIFT_GRID_RIGHT,
      ),
      height: Math.max(
        0,
        chartHeight -
          CHROMATIC_FOCAL_SHIFT_GRID_TOP -
          CHROMATIC_FOCAL_SHIFT_GRID_BOTTOM,
      ),
    },
    xAxis: {
      type: "value",
      name:
        unitX === "D"
          ? "Output Vergence Shift (D)"
          : unitX
            ? `Focal Shift (${unitX})`
            : "Focal Shift",
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
      min: yAxisMin,
      max: yAxisMax,
      name: unitY ? `Wavelength (${unitY})` : "Wavelength",
      nameLocation: "middle",
      nameGap: 50,
      // Keep the axis at the plot edge so the dashed zero-shift line stays visible.
      axisLine: {
        onZero: false,
      },
      nameTextStyle: {
        color: textColor,
      },
      axisLabel: {
        color: textColor,
        formatter: (value: number) => formatPlotValue(value),
      },
    },
    series: [
      {
        name: "Focal Shift",
        type: "line",
        data: toLineData(chromaticFocalShiftData),
        showSymbol: false,
      },
      {
        name: "Zero Shift",
        type: "line",
        data: [
          [0, yAxisMin],
          [0, yAxisMax],
        ],
        showSymbol: false,
        silent: true,
        lineStyle: {
          type: "dashed",
          color: REFERENCE_LINE_COLOR,
          width: 1,
        },
      },
    ],
  };
}
