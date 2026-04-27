import { buildWavefrontMapOption } from "./wavefrontMapChartOption";
import { createAnalysisChartComponent } from "@/features/analysis/lib/createAnalysisChartComponent";
import type { WavefrontMapData } from "@/features/analysis/types/plotData";

interface WavefrontMapChartProps {
  readonly wavefrontMapData: WavefrontMapData;
  readonly autoHeight?: boolean;
}

export const WavefrontMapChart = createAnalysisChartComponent<WavefrontMapChartProps, WavefrontMapData>({
  displayName: "WavefrontMapChart",
  testId: "wavefront-map-chart",
  ariaLabel: "Wavefront Map plot",
  debounceMs: 500,
  getBuilderArgs: ({ wavefrontMapData }) => wavefrontMapData,
  getChartHeight: ({ parentWidth, parentHeight, autoHeight }) =>
    autoHeight ? parentWidth : Math.max(0, Math.min(parentWidth, parentHeight)),
  buildOption: (wavefrontMapData, chartWidth, chartHeight, chartTextColor) =>
    buildWavefrontMapOption(wavefrontMapData, chartWidth, chartHeight, chartTextColor),
});
