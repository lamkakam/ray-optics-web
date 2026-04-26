import type { DiffractionPsfData } from "@/features/analysis/types/plotData";
import { buildDiffractionPsfOption } from "@/features/analysis/components/diffraction-psf-chart/diffractionPsfChartOption";
import { createAnalysisChartComponent } from "@/features/analysis/components/createAnalysisChartComponent";

interface DiffractionPsfChartProps {
  readonly diffractionPsfData: DiffractionPsfData;
  readonly autoHeight?: boolean;
}

export const DiffractionPsfChart = createAnalysisChartComponent<DiffractionPsfChartProps, DiffractionPsfData>({
  displayName: "DiffractionPsfChart",
  testId: "diffraction-psf-chart",
  ariaLabel: "Diffraction PSF plot",
  debounceMs: 500,
  getBuilderArgs: ({ diffractionPsfData }) => diffractionPsfData,
  getChartHeight: ({ parentWidth, parentHeight, autoHeight }) =>
    autoHeight ? parentWidth : Math.max(0, Math.min(parentWidth, parentHeight)),
  buildOption: (diffractionPsfData, chartWidth, chartHeight, chartTextColor) =>
    buildDiffractionPsfOption(diffractionPsfData, chartWidth, chartHeight, chartTextColor),
});
