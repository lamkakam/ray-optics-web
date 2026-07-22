import type { StrehlVsWavelengthData } from "@/features/analysis/types/plotData";
import { createAnalysisChartComponent } from "@/features/analysis/lib/createAnalysisChartComponent";
import { buildStrehlVsWavelengthOption } from "./strehlVsWavelengthChartOption";

interface StrehlVsWavelengthChartProps {
  readonly strehlVsWavelengthData: StrehlVsWavelengthData;
  readonly autoHeight?: boolean;
}

/**
Typed React wrapper for the Strehl vs Wavelength ECharts line plot.

## Behavior

- Uses `createAnalysisChartComponent` for measurement, theme-aware text color, debounced ECharts updates, and disposal.
- Renders into a `div` with `data-testid="strehl-vs-wavelength-chart"` and `aria-label="Strehl vs Wavelength plot"`.
- Uses `buildStrehlVsWavelengthOption(...)` to build chart options from measured dimensions.
- In fixed-height mode, chart height is capped by the parent height and otherwise targets 60% of chart width with a 300 px minimum.
*/
export const StrehlVsWavelengthChart = createAnalysisChartComponent<StrehlVsWavelengthChartProps, StrehlVsWavelengthData>({
  displayName: "StrehlVsWavelengthChart",
  testId: "strehl-vs-wavelength-chart",
  ariaLabel: "Strehl vs Wavelength plot",
  debounceMs: 500,
  getBuilderArgs: ({ strehlVsWavelengthData }) => strehlVsWavelengthData,
  getChartHeight: ({ parentWidth, parentHeight, autoHeight }) =>
    autoHeight
      ? Math.max(Math.round(parentWidth * 0.6), 300)
      : Math.max(0, Math.min(parentHeight, Math.max(Math.round(parentWidth * 0.6), 300))),
  isDimensionValid: ({ width, height }) => width > 0 && height > 0,
  buildOption: (strehlVsWavelengthData, chartWidth, chartHeight, chartTextColor) =>
    buildStrehlVsWavelengthOption(strehlVsWavelengthData, chartWidth, chartHeight, chartTextColor),
});
