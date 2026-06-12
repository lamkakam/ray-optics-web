import type { AstigmatismCurveData } from "@/features/analysis/types/plotData";
import { createAnalysisChartComponent } from "@/features/analysis/lib/createAnalysisChartComponent";
import { buildAstigmatismOption } from "./astigmatismChartOption";

interface AstigmatismChartProps {
  readonly astigmatismCurveData: AstigmatismCurveData;
  readonly autoHeight?: boolean;
}

interface AstigmatismChartBuilderArgs {
  readonly astigmatismCurveData: AstigmatismCurveData;
}

export const AstigmatismChart = createAnalysisChartComponent<AstigmatismChartProps, AstigmatismChartBuilderArgs>({
  displayName: "AstigmatismChart",
  testId: "astigmatism-chart",
  ariaLabel: "Astigmatism plot",
  debounceMs: 500,
  getBuilderArgs: ({ astigmatismCurveData }) => ({ astigmatismCurveData }),
  getChartHeight: ({ parentWidth, parentHeight, autoHeight }) =>
    autoHeight
      ? Math.max(Math.round(parentWidth * 0.6), 300)
      : Math.max(0, Math.min(parentHeight, Math.max(Math.round(parentWidth * 0.6), 300))),
  isDimensionValid: ({ width, height }) => width > 0 && height > 0,
  buildOption: ({ astigmatismCurveData }, chartWidth, chartHeight, chartTextColor) =>
    buildAstigmatismOption(astigmatismCurveData, chartWidth, chartHeight, chartTextColor),
});
