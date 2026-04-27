import { buildSpotDiagramOption } from "./spotDiagramChartOption";
import { createAnalysisChartComponent } from "@/features/analysis/components/CreateAnalysisChartComponent";
import type { SpotDiagramData } from "@/features/analysis/types/plotData";

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
