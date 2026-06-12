import type { FieldCurveData } from "@/features/analysis/types/plotData";
import { createAnalysisChartComponent } from "@/features/analysis/lib/createAnalysisChartComponent";
import { buildFieldCurveOption } from "./fieldCurveChartOption";

interface FieldCurveChartProps {
  readonly fieldCurveData: FieldCurveData;
  readonly autoHeight?: boolean;
}

interface FieldCurveChartBuilderArgs {
  readonly fieldCurveData: FieldCurveData;
}

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
