import { buildGeoPsfOption } from "./geoPsfChartOption";
import { createAnalysisChartComponent } from "@/features/analysis/components/CreateAnalysisChartComponent";
import type { GeoPsfData } from "@/features/analysis/types/plotData";

interface GeoPsfChartProps {
  readonly geoPsfData: GeoPsfData;
  readonly autoHeight?: boolean;
}

export const GeoPsfChart = createAnalysisChartComponent<GeoPsfChartProps, GeoPsfData>({
  displayName: "GeoPsfChart",
  testId: "geo-psf-chart",
  ariaLabel: "Geometric PSF plot",
  debounceMs: 500,
  getBuilderArgs: ({ geoPsfData }) => geoPsfData,
  getChartHeight: ({ parentWidth, parentHeight, autoHeight }) =>
    autoHeight ? parentWidth : Math.max(0, Math.min(parentWidth, parentHeight)),
  buildOption: (geoPsfData, chartWidth, chartHeight, chartTextColor) =>
    buildGeoPsfOption(geoPsfData, chartWidth, chartHeight, chartTextColor),
});
