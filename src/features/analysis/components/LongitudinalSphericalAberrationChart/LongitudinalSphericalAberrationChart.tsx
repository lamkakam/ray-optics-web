/**
# `features/analysis/components/LongitudinalSphericalAberrationChart/LongitudinalSphericalAberrationChart.tsx`
*/
import type { LongitudinalSphericalAberrationData } from "@/features/analysis/types/plotData";
import { createAnalysisChartComponent } from "@/features/analysis/lib/createAnalysisChartComponent";
import { buildLongitudinalSphericalAberrationOption } from "./longitudinalSphericalAberrationChartOption";

/**
## Props

- `longitudinalSphericalAberrationData`: all wavelength LSA series to render.
- `wavelengthLabels`: labels used to name the wavelength series.
- `autoHeight`: optional responsive height behavior passed through to the shared chart factory.
*/
interface LongitudinalSphericalAberrationChartProps {
  readonly longitudinalSphericalAberrationData: LongitudinalSphericalAberrationData;
  readonly wavelengthLabels: readonly string[];
  readonly autoHeight?: boolean;
}

interface LongitudinalSphericalAberrationChartBuilderArgs {
  readonly longitudinalSphericalAberrationData: LongitudinalSphericalAberrationData;
  readonly wavelengthLabels: readonly string[];
}

/**
## Purpose

Wraps the shared analysis ECharts component factory for longitudinal spherical aberration data.
*/
export const LongitudinalSphericalAberrationChart = createAnalysisChartComponent<
  LongitudinalSphericalAberrationChartProps,
  LongitudinalSphericalAberrationChartBuilderArgs
>({
  displayName: "LongitudinalSphericalAberrationChart",
  testId: "longitudinal-spherical-aberration-chart",
  ariaLabel: "Longitudinal spherical aberration plot",
  debounceMs: 500,
  getBuilderArgs: ({ longitudinalSphericalAberrationData, wavelengthLabels }) => ({
    longitudinalSphericalAberrationData,
    wavelengthLabels,
  }),
  getChartHeight: ({ parentWidth, parentHeight, autoHeight }) =>
    autoHeight
      ? Math.max(Math.round(parentWidth * 0.6), 300)
      : Math.max(0, Math.min(parentHeight, Math.max(Math.round(parentWidth * 0.6), 300))),
  isDimensionValid: ({ width, height }) => width > 0 && height > 0,
  buildOption: ({ longitudinalSphericalAberrationData, wavelengthLabels }, chartWidth, chartHeight, chartTextColor) =>
    buildLongitudinalSphericalAberrationOption(
      longitudinalSphericalAberrationData,
      wavelengthLabels,
      chartWidth,
      chartHeight,
      chartTextColor,
    ),
});
