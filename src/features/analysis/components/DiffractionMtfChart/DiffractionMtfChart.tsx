import type { DiffractionMtfData } from "@/features/analysis/types/plotData";
import { buildDiffractionMtfOption } from "./diffractionMtfChartOption";
import { createAnalysisChartComponent } from "@/features/analysis/lib/createAnalysisChartComponent";

interface DiffractionMtfChartProps {
  readonly diffractionMtfData: DiffractionMtfData;
  readonly autoHeight?: boolean;
}

/**
Typed React wrapper for the Diffraction MTF ECharts line plot.

## Behavior

- Uses `createAnalysisChartComponent` for measurement, theme-aware text color, debounced ECharts updates, and disposal.
- Renders into a `div` with `data-testid="diffraction-mtf-chart"` and `aria-label="Diffraction MTF plot"`.
- Uses `buildDiffractionMtfOption(...)` to build chart options from measured dimensions.
- In fixed-height mode, chart height is capped by the parent height and otherwise targets 60% of chart width with a 300 px minimum.
*/
export const DiffractionMtfChart = createAnalysisChartComponent<DiffractionMtfChartProps, DiffractionMtfData>({
  displayName: "DiffractionMtfChart",
  testId: "diffraction-mtf-chart",
  ariaLabel: "Diffraction MTF plot",
  debounceMs: 500,
  getBuilderArgs: ({ diffractionMtfData }) => diffractionMtfData,
  getChartHeight: ({ parentWidth, parentHeight, autoHeight }) =>
    autoHeight
      ? Math.max(Math.round(parentWidth * 0.6), 300)
      : Math.max(0, Math.min(parentHeight, Math.max(Math.round(parentWidth * 0.6), 300))),
  isDimensionValid: ({ width, height }) => width > 0 && height > 0,
  buildOption: (diffractionMtfData, chartWidth, chartHeight, chartTextColor) =>
    buildDiffractionMtfOption(diffractionMtfData, chartWidth, chartHeight, chartTextColor),
});
