import type { AstigmatismCurveData } from "@/features/analysis/types/plotData";
import { createAnalysisChartComponent } from "@/features/analysis/lib/createAnalysisChartComponent";
import { buildAstigmatismOption } from "./astigmatismChartOption";

interface AstigmatismChartProps {
  /** `AstigmatismCurveData` payload to render. */
  readonly astigmatismCurveData: AstigmatismCurveData;
  /** optional responsive height behavior passed through to the shared chart factory. */
  readonly autoHeight?: boolean;
}

interface AstigmatismChartBuilderArgs {
  readonly astigmatismCurveData: AstigmatismCurveData;
}

/**
Wraps the shared analysis ECharts component factory for the Astigmatism Curve plot.

## Behavior

- Uses `buildAstigmatismOption` to render one `Astigmatism` line series.
- Uses `data-testid="astigmatism-chart"` and `aria-label="Astigmatism plot"`.
- Matches the field-curvature chart sizing behavior: height is 60% of parent width with a 300px minimum, capped by parent height unless `autoHeight` is enabled.
*/
export const AstigmatismChart = createAnalysisChartComponent<AstigmatismChartProps, AstigmatismChartBuilderArgs>({
  displayName: "AstigmatismChart",
  testId: "astigmatism-chart",
  ariaLabel: "Astigmatism plot",
  debounceMs: 500,
  getBuilderArgs: ({ astigmatismCurveData }) => ({ astigmatismCurveData }),
  getChartHeight: ({ parentWidth, parentHeight, autoHeight }) =>
    autoHeight
      ? Math.max(Math.round(parentWidth * 0.6), 300)
      : Math.max(0, Math.min(parentHeight, Math.max(Math.round(parentWidth * 0.6), 300))),
  isDimensionValid: ({ width, height }) => width > 0 && height > 0,
  buildOption: ({ astigmatismCurveData }, chartWidth, chartHeight, chartTextColor) =>
    buildAstigmatismOption(astigmatismCurveData, chartWidth, chartHeight, chartTextColor),
});
