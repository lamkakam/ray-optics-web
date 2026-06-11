import { buildOpdFanChartOption } from "./opdFanChartOption";
import { createAnalysisChartComponent } from "@/features/analysis/lib/createAnalysisChartComponent";
import { useScreenBreakpoint } from "@/shared/hooks/useScreenBreakpoint";
import type { OpdFanData } from "@/features/analysis/types/plotData";

interface OpdFanChartProps {
  readonly opdFanData: OpdFanData;
  readonly wavelengthLabels: readonly string[];
  readonly autoHeight?: boolean;
}

export const OpdFanChart = createAnalysisChartComponent<
  OpdFanChartProps,
  { readonly opdFanData: OpdFanData; readonly wavelengthLabels: readonly string[]; readonly isSmallScreen: boolean },
  boolean
>({
  displayName: "OpdFanChart",
  testId: "opd-fan-chart",
  ariaLabel: "OPD fan plot",
  debounceMs: 500,
  useRuntimeContext: () => useScreenBreakpoint() === "screenSM",
  getBuilderArgs: ({ opdFanData, wavelengthLabels }, isSmallScreen) => ({
    opdFanData,
    wavelengthLabels,
    isSmallScreen,
  }),
  getChartHeight: ({ parentWidth, parentHeight, autoHeight }, isSmallScreen) => {
    const widthBasedHeight = isSmallScreen
      ? Math.max(Math.round(parentWidth), 560)
      : Math.max(Math.round(parentWidth / 2), 320);

    return autoHeight
      ? widthBasedHeight
      : Math.max(0, Math.min(parentHeight, widthBasedHeight));
  },
  isDimensionValid: ({ width, height }) => width > 0 && height > 0,
  buildOption: ({ opdFanData, wavelengthLabels, isSmallScreen }, chartWidth, chartHeight, chartTextColor) =>
    buildOpdFanChartOption(opdFanData, wavelengthLabels, chartWidth, chartHeight, chartTextColor, isSmallScreen),
});
