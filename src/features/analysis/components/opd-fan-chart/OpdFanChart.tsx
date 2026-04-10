import { buildOpdFanChartOption } from "@/features/analysis/components/opd-fan-chart/opdFanChartOption";
import { createAnalysisChartComponent } from "@/features/analysis/components/createAnalysisChartComponent";
import type { OpdFanData } from "@/shared/lib/types/opticalModel";

interface OpdFanChartProps {
  readonly opdFanData: OpdFanData;
  readonly wavelengthLabels: readonly string[];
  readonly autoHeight?: boolean;
}

export const OpdFanChart = createAnalysisChartComponent<
  OpdFanChartProps,
  { readonly opdFanData: OpdFanData; readonly wavelengthLabels: readonly string[] }
>({
  displayName: "OpdFanChart",
  testId: "opd-fan-chart",
  ariaLabel: "OPD fan plot",
  debounceMs: 500,
  getBuilderArgs: ({ opdFanData, wavelengthLabels }) => ({ opdFanData, wavelengthLabels }),
  getChartHeight: ({ parentWidth, parentHeight, autoHeight }) =>
    autoHeight
      ? Math.max(Math.round(parentWidth / 2), 320)
      : Math.max(0, Math.min(parentHeight, Math.max(Math.round(parentWidth / 2), 320))),
  isDimensionValid: ({ width, height }) => width > 0 && height > 0,
  buildOption: ({ opdFanData, wavelengthLabels }, chartWidth, chartHeight, chartTextColor) =>
    buildOpdFanChartOption(opdFanData, wavelengthLabels, chartWidth, chartHeight, chartTextColor),
});
