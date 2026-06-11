import { buildRayFanChartOption } from "./rayFanChartOption";
import { createAnalysisChartComponent } from "@/features/analysis/lib/createAnalysisChartComponent";
import { useScreenBreakpoint } from "@/shared/hooks/useScreenBreakpoint";
import type { RayFanData } from "@/features/analysis/types/plotData";

interface RayFanChartProps {
  readonly rayFanData: RayFanData;
  readonly wavelengthLabels: readonly string[];
  readonly autoHeight?: boolean;
}

export const RayFanChart = createAnalysisChartComponent<
  RayFanChartProps,
  { readonly rayFanData: RayFanData; readonly wavelengthLabels: readonly string[]; readonly isSmallScreen: boolean },
  boolean
>({
  displayName: "RayFanChart",
  testId: "ray-fan-chart",
  ariaLabel: "Ray fan plot",
  debounceMs: 500,
  useRuntimeContext: () => useScreenBreakpoint() === "screenSM",
  getBuilderArgs: ({ rayFanData, wavelengthLabels }, isSmallScreen) => ({
    rayFanData,
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
  buildOption: ({ rayFanData, wavelengthLabels, isSmallScreen }, chartWidth, chartHeight, chartTextColor) =>
    buildRayFanChartOption(rayFanData, wavelengthLabels, chartWidth, chartHeight, chartTextColor, isSmallScreen),
});
