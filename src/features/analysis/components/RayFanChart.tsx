import { buildRayFanChartOption } from "@/features/analysis/components/rayFanChartOption";
import { createAnalysisChartComponent } from "@/features/analysis/components/createAnalysisChartComponent";
import type { RayFanData } from "@/shared/lib/types/opticalModel";

interface RayFanChartProps {
  readonly rayFanData: RayFanData;
  readonly wavelengthLabels: readonly string[];
  readonly autoHeight?: boolean;
}

export const RayFanChart = createAnalysisChartComponent<
  RayFanChartProps,
  { readonly rayFanData: RayFanData; readonly wavelengthLabels: readonly string[] }
>({
  displayName: "RayFanChart",
  testId: "ray-fan-chart",
  ariaLabel: "Ray fan plot",
  debounceMs: 500,
  getBuilderArgs: ({ rayFanData, wavelengthLabels }) => ({ rayFanData, wavelengthLabels }),
  getChartHeight: ({ parentWidth, parentHeight, autoHeight }) =>
    autoHeight ? Math.max(Math.round(parentWidth / 2), 320) : Math.max(0, parentHeight),
  isDimensionValid: ({ width, height }) => width > 0 && height > 0,
  buildOption: ({ rayFanData, wavelengthLabels }, chartWidth, chartHeight, chartTextColor) =>
    buildRayFanChartOption(rayFanData, wavelengthLabels, chartWidth, chartHeight, chartTextColor),
});
