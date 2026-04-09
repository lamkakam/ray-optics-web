import type { PlotType } from "@/features/analysis/components/AnalysisPlotView";
import type { DiffractionPsfData, GeoPsfData, OpdFanData, OpticalModel, RayFanData, SpotDiagramData, WavefrontMapData } from "@/shared/lib/types/opticalModel";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";

export type PlotFn = (fieldIndex: number, wavelengthIndex: number) => Promise<string>;
export type AnalysisPlotLoadResult =
  | { readonly kind: "image"; readonly image: string }
  | { readonly kind: "rayFan"; readonly rayFanData: RayFanData }
  | { readonly kind: "opdFan"; readonly opdFanData: OpdFanData }
  | { readonly kind: "spotDiagram"; readonly spotDiagramData: SpotDiagramData }
  | { readonly kind: "geoPSF"; readonly geoPsfData: GeoPsfData }
  | { readonly kind: "wavefrontMap"; readonly wavefrontMapData: WavefrontMapData }
  | { readonly kind: "diffractionPSF"; readonly diffractionPsfData: DiffractionPsfData };

interface LoadAnalysisPlotParams {
  readonly plotType: PlotType;
  readonly proxy: PyodideWorkerAPI | undefined;
  readonly model: OpticalModel | undefined;
  readonly fieldIndex: number;
  readonly wavelengthIndex: number;
}

export const PLOT_FUNCTION_BUILDERS: Record<
  PlotType,
  (proxy: PyodideWorkerAPI, model: OpticalModel) => PlotFn
> = {
  rayFan:                   (proxy, m) => (fi)     => proxy.plotRayFan(m, fi),
  opdFan:                   (proxy, m) => (fi)     => proxy.plotOpdFan(m, fi),
  spotDiagram:              (proxy, m) => (fi)     => proxy.plotSpotDiagram(m, fi),
  surfaceBySurface3rdOrder: (proxy, m) => ()       => proxy.plotSurfaceBySurface3rdOrderAberr(m),
  wavefrontMap:             ()          => async () => {
    throw new Error("wavefrontMap should be loaded through getWavefrontData");
  },
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

export async function loadAnalysisPlot({
  plotType,
  proxy,
  model,
  fieldIndex,
  wavelengthIndex,
}: LoadAnalysisPlotParams): Promise<AnalysisPlotLoadResult | undefined> {
  if (!proxy || !model) return undefined;

  if (plotType === "rayFan") {
    return {
      kind: "rayFan",
      rayFanData: await proxy.getRayFanData(model, fieldIndex),
    };
  }

  if (plotType === "wavefrontMap") {
    return {
      kind: "wavefrontMap",
      wavefrontMapData: await proxy.getWavefrontData(model, fieldIndex, wavelengthIndex),
    };
  }

  if (plotType === "opdFan") {
    return {
      kind: "opdFan",
      opdFanData: await proxy.getOpdFanData(model, fieldIndex),
    };
  }

  if (plotType === "spotDiagram") {
    return {
      kind: "spotDiagram",
      spotDiagramData: await proxy.getSpotDiagramData(model, fieldIndex),
    };
  }

  if (plotType === "geoPSF") {
    return {
      kind: "geoPSF",
      geoPsfData: await proxy.getGeoPSFData(model, fieldIndex, wavelengthIndex),
    };
  }

  if (plotType === "diffractionPSF") {
    return {
      kind: "diffractionPSF",
      diffractionPsfData: await proxy.getDiffractionPSFData(model, fieldIndex, wavelengthIndex),
    };
  }

  const plotFn = buildPlotFn(plotType, proxy, model);
  if (!plotFn) return undefined;

  return {
    kind: "image",
    image: await plotFn(fieldIndex, wavelengthIndex),
  };
}
