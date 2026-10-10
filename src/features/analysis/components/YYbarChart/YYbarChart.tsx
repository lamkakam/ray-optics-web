import type { YYbarData } from "@/features/analysis/types/plotData";
import { createAnalysisChartComponent } from "@/features/analysis/lib/createAnalysisChartComponent";
import { buildYYbarChartOption } from "./yYbarChartOption";

interface YYbarChartProps {
  readonly yYbarData: YYbarData;
  readonly autoHeight?: boolean;
}

/**
 * Typed React wrapper for the paraxial y-ȳ (Delano) diagram ECharts line plot.
 *
 * @remarks
 * ## Behavior
 *
 * - Uses `createAnalysisChartComponent` for measurement, theme-aware text color, debounced ECharts updates, and disposal.
 * - Renders into a `div` with `data-testid="y-ybar-chart"` and `aria-label="y-ȳ Diagram plot"`.
 * - Uses `buildYYbarChartOption(...)` to build chart options from measured dimensions.
 * - In fixed-height mode, chart height is capped by the parent height and otherwise targets 60% of chart width with a 300 px minimum.
 */
export const YYbarChart = createAnalysisChartComponent<
  YYbarChartProps,
  YYbarData
>({
  displayName: "YYbarChart",
  testId: "y-ybar-chart",
  ariaLabel: "y-ȳ Diagram plot",
  debounceMs: 500,
  getBuilderArgs: ({ yYbarData }) => yYbarData,
  getChartHeight: ({ parentWidth, parentHeight, autoHeight }) =>
    autoHeight
      ? Math.max(Math.round(parentWidth * 0.6), 300)
      : Math.max(
          0,
          Math.min(parentHeight, Math.max(Math.round(parentWidth * 0.6), 300)),
        ),
  isDimensionValid: ({ width, height }) => width > 0 && height > 0,
  buildOption: (yYbarData, chartWidth, chartHeight, chartTextColor) =>
    buildYYbarChartOption(yYbarData, chartWidth, chartHeight, chartTextColor),
});
