import { buildWavefrontMapOption } from "@/features/analysis/components/wavefrontMapChartOption";
import { createAnalysisChartComponent } from "@/features/analysis/components/createAnalysisChartComponent";
import type { WavefrontMapData } from "@/shared/lib/types/opticalModel";

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
