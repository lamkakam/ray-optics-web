import { buildSpotDiagramOption } from "@/features/analysis/components/spotDiagramChartOption";
import { createAnalysisChartComponent } from "@/features/analysis/components/createAnalysisChartComponent";
import type { SpotDiagramData } from "@/shared/lib/types/opticalModel";

interface SpotDiagramChartProps {
  readonly spotDiagramData: SpotDiagramData;
  readonly wavelengthLabels: readonly string[];
  readonly autoHeight?: boolean;
}

export const SpotDiagramChart = createAnalysisChartComponent<
  SpotDiagramChartProps,
  { readonly spotDiagramData: SpotDiagramData; readonly wavelengthLabels: readonly string[] }
>({
  displayName: "SpotDiagramChart",
  testId: "spot-diagram-chart",
  ariaLabel: "Spot diagram plot",
  debounceMs: 500,
  getBuilderArgs: ({ spotDiagramData, wavelengthLabels }) => ({ spotDiagramData, wavelengthLabels }),
  getChartHeight: ({ parentWidth, parentHeight, autoHeight }) =>
    autoHeight ? parentWidth : Math.max(0, Math.min(parentWidth, parentHeight)),
  buildOption: ({ spotDiagramData, wavelengthLabels }, chartWidth, chartHeight, chartTextColor) =>
    buildSpotDiagramOption(spotDiagramData, wavelengthLabels, chartWidth, chartHeight, chartTextColor),
});
