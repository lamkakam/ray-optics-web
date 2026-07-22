/**
# `features/analysis/components/FieldCurveChart/FieldCurveChart.tsx`
*/
import type { FieldCurveData } from "@/features/analysis/types/plotData";
import { createAnalysisChartComponent } from "@/features/analysis/lib/createAnalysisChartComponent";
import { buildFieldCurveOption } from "./fieldCurveChartOption";

/**
## Props

- `fieldCurveData`: `FieldCurveData` payload to render.
- `autoHeight`: optional responsive height behavior passed through to the shared chart factory.
*/
interface FieldCurveChartProps {
  readonly fieldCurveData: FieldCurveData;
  readonly autoHeight?: boolean;
}

interface FieldCurveChartBuilderArgs {
  readonly fieldCurveData: FieldCurveData;
}

/**
## Purpose

Wraps the shared analysis ECharts component factory for Field Curvature plot data.
*/
export const FieldCurveChart = createAnalysisChartComponent<FieldCurveChartProps, FieldCurveChartBuilderArgs>({
  displayName: "FieldCurveChart",
  testId: "field-curve-chart",
  ariaLabel: "Field curve plot",
  debounceMs: 500,
  getBuilderArgs: ({ fieldCurveData }) => ({ fieldCurveData }),
  getChartHeight: ({ parentWidth, parentHeight, autoHeight }) =>
    autoHeight
      ? Math.max(Math.round(parentWidth * 0.6), 300)
      : Math.max(0, Math.min(parentHeight, Math.max(Math.round(parentWidth * 0.6), 300))),
  isDimensionValid: ({ width, height }) => width > 0 && height > 0,
  buildOption: ({ fieldCurveData }, chartWidth, chartHeight, chartTextColor) =>
    buildFieldCurveOption(fieldCurveData, chartWidth, chartHeight, chartTextColor),
});
