import type { ChromaticFocalShiftData } from "@/features/analysis/types/plotData";
import { createAnalysisChartComponent } from "@/features/analysis/lib/createAnalysisChartComponent";
import { buildChromaticFocalShiftOption } from "./chromaticFocalShiftChartOption";

interface ChromaticFocalShiftChartProps {
  readonly chromaticFocalShiftData: ChromaticFocalShiftData;
  readonly autoHeight?: boolean;
}

/**
 * Typed React wrapper for the Chromatic Focal Shift ECharts line plot.
 *
 * @remarks
 * ## Behavior
 *
 * - Uses `createAnalysisChartComponent` for measurement, theme-aware text color, debounced ECharts updates, and disposal.
 * - Renders into a `div` with `data-testid="chromatic-focal-shift-chart"` and `aria-label="Chromatic Focal Shift plot"`.
 * - Uses `buildChromaticFocalShiftOption(...)` to build chart options from measured dimensions.
 * - In fixed-height mode, chart height is capped by the parent height and otherwise targets 60% of chart width with a 300 px minimum.
 */
export const ChromaticFocalShiftChart = createAnalysisChartComponent<
  ChromaticFocalShiftChartProps,
  ChromaticFocalShiftData
>({
  displayName: "ChromaticFocalShiftChart",
  testId: "chromatic-focal-shift-chart",
  ariaLabel: "Chromatic Focal Shift plot",
  debounceMs: 500,
  getBuilderArgs: ({ chromaticFocalShiftData }) => chromaticFocalShiftData,
  getChartHeight: ({ parentWidth, parentHeight, autoHeight }) =>
    autoHeight
      ? Math.max(Math.round(parentWidth * 0.6), 300)
      : Math.max(
          0,
          Math.min(parentHeight, Math.max(Math.round(parentWidth * 0.6), 300)),
        ),
  isDimensionValid: ({ width, height }) => width > 0 && height > 0,
  buildOption: (
    chromaticFocalShiftData,
    chartWidth,
    chartHeight,
    chartTextColor,
  ) =>
    buildChromaticFocalShiftOption(
      chromaticFocalShiftData,
      chartWidth,
      chartHeight,
      chartTextColor,
    ),
});
