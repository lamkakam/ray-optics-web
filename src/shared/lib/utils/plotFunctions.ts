import type { PlotType } from "@/features/analysis/components/AnalysisPlotView";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import type { PyodideWorkerAPI } from "@/hooks/usePyodide";

export type PlotFn = (fieldIndex: number, wavelengthIndex: number) => Promise<string>;

export const PLOT_FUNCTION_BUILDERS: Record<
  PlotType,
  (proxy: PyodideWorkerAPI, model: OpticalModel) => PlotFn
> = {
  rayFan:                   (proxy, m) => (fi)     => proxy.plotRayFan(m, fi),
  opdFan:                   (proxy, m) => (fi)     => proxy.plotOpdFan(m, fi),
  spotDiagram:              (proxy, m) => (fi)     => proxy.plotSpotDiagram(m, fi),
  surfaceBySurface3rdOrder: (proxy, m) => ()       => proxy.plotSurfaceBySurface3rdOrderAberr(m),
  wavefrontMap:             (proxy, m) => (fi, wi) => proxy.plotWavefrontMap(m, fi, wi),
  geoPSF:                   (proxy, m) => (fi, wi) => proxy.plotGeoPSF(m, fi, wi),
  diffractionPSF:           (proxy, m) => (fi, wi) => proxy.plotDiffractionPSF(m, fi, wi),
};

export function buildPlotFn(
  plotType: PlotType,
  proxy: PyodideWorkerAPI | undefined,
  model: OpticalModel | undefined
): PlotFn | undefined {
  if (!proxy || !model) return undefined;
  return PLOT_FUNCTION_BUILDERS[plotType](proxy, model);
}
