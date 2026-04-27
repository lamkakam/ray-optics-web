import { buildSurfaceBySurface3rdOrderChartOption } from "./surfaceBySurface3rdOrderChartOption";
import { createAnalysisChartComponent } from "@/features/analysis/lib/createAnalysisChartComponent";
import type { SeidelSurfaceBySurfaceData } from "@/features/lens-editor/types/seidelData";

interface SurfaceBySurface3rdOrderChartProps {
  readonly surfaceBySurface3rdOrderData: SeidelSurfaceBySurfaceData;
  readonly autoHeight?: boolean;
}

export const SurfaceBySurface3rdOrderChart = createAnalysisChartComponent<
  SurfaceBySurface3rdOrderChartProps,
  SeidelSurfaceBySurfaceData
>({
  displayName: "SurfaceBySurface3rdOrderChart",
  testId: "surface-by-surface-3rd-order-chart",
  ariaLabel: "Surface by surface 3rd order aberration plot",
  debounceMs: 500,
  getBuilderArgs: ({ surfaceBySurface3rdOrderData }) => surfaceBySurface3rdOrderData,
  getChartHeight: ({ parentWidth, parentHeight, autoHeight }) =>
    autoHeight
      ? Math.max(Math.round(parentWidth * 0.6), 320)
      : Math.max(0, Math.min(parentHeight, Math.max(Math.round(parentWidth * 0.6), 320))),
  isDimensionValid: ({ width, height }) => width > 0 && height > 0,
  buildOption: (surfaceBySurface3rdOrderData, chartWidth, chartHeight, chartTextColor) =>
    buildSurfaceBySurface3rdOrderChartOption(surfaceBySurface3rdOrderData, chartWidth, chartHeight, chartTextColor),
});
