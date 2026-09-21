import { useMemo } from "react";
import {
  buildSpotDiagramOption,
  SPOT_DIAGRAM_HORIZONTAL_INSETS,
} from "./spotDiagramChartOption";
import { createAnalysisChartComponent } from "@/features/analysis/lib/createAnalysisChartComponent";
import { calculateSpotDiagramRadii } from "@/features/analysis/lib/calculateSpotDiagramRadii";
import { Chip } from "@/shared/components/primitives/Chip";
import { formatPlotValue } from "@/shared/lib/chart-formatting/formatPlotValue";
import type { SpotDiagramData } from "@/features/analysis/types/plotData";

interface SpotDiagramChartProps {
  readonly spotDiagramData: SpotDiagramData;
  readonly wavelengthLabels: readonly string[];
  /** Committed spectral weights indexed by wvlIdx, independent of legend visibility. */
  readonly wavelengthWeights: Readonly<Record<number, number | undefined>>;
  readonly autoHeight?: boolean;
}

/** Owns theme-aware chart options and lifecycle; fixed panels reserve footer height, while automatic panels keep a square canvas. */
const SpotDiagramCanvas = createAnalysisChartComponent<
  SpotDiagramChartProps,
  {
    readonly spotDiagramData: SpotDiagramData;
    readonly wavelengthLabels: readonly string[];
  }
>({
  displayName: "SpotDiagramChart",
  testId: "spot-diagram-chart",
  ariaLabel: "Spot diagram plot",
  debounceMs: 500,
  extraContentInsets: SPOT_DIAGRAM_HORIZONTAL_INSETS,
  getBuilderArgs: ({ spotDiagramData, wavelengthLabels }) => ({
    spotDiagramData,
    wavelengthLabels,
  }),
  getChartHeight: ({ parentWidth, parentHeight, autoHeight }) =>
    autoHeight ? parentWidth : Math.max(0, Math.min(parentWidth, parentHeight)),
  buildOption: (
    { spotDiagramData, wavelengthLabels },
    chartWidth,
    chartHeight,
    chartTextColor,
  ) =>
    buildSpotDiagramOption(
      spotDiagramData,
      wavelengthLabels,
      chartWidth,
      chartHeight,
      chartTextColor,
    ),
});

/**
 * Renders a spot diagram with GEO then RMS radius chips centered below its x-axis.
 * Memoizes unrounded reference-based radii across all positive-weight wavelengths,
 * regardless of legend visibility. Uses formatPlotValue with µm or afocal arcsec
 * on each chip, or N/A when unavailable. The chip row wraps on narrow panels.
 * The generated chart retains its image label/test ID and owns sizing and lifecycle.
 */
export function SpotDiagramChart(props: SpotDiagramChartProps) {
  const { spotDiagramData, wavelengthWeights } = props;
  const radii = useMemo(
    () => calculateSpotDiagramRadii(spotDiagramData, wavelengthWeights),
    [spotDiagramData, wavelengthWeights],
  );
  return (
    <SpotDiagramCanvas
      {...props}
      extraContent={
        <div className="flex flex-wrap justify-center gap-2 py-1 whitespace-nowrap">
          <Chip>
            GEO radius:{" "}
            {radii
              ? `${formatPlotValue(radii.geoRadius)} ${radii.unit}`
              : "N/A"}
          </Chip>
          <Chip>
            RMS radius:{" "}
            {radii
              ? `${formatPlotValue(radii.rmsRadius)} ${radii.unit}`
              : "N/A"}
          </Chip>
        </div>
      }
    />
  );
}
