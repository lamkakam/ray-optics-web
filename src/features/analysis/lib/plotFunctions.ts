import type { PlotType } from "@/features/analysis/components";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import type { DiffractionMtfData, DiffractionPsfData, GeoPsfData, OpdFanData, RayFanData, SpotDiagramData, WavefrontMapData } from "@/features/analysis/types/plotData";
import type { SeidelSurfaceBySurfaceData } from "@/features/lens-editor/types/seidelData";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";

export type AnalysisPlotLoadResult =
  | { readonly kind: "surfaceBySurface3rdOrder"; readonly surfaceBySurface3rdOrderData: SeidelSurfaceBySurfaceData }
  | { readonly kind: "rayFan"; readonly rayFanData: RayFanData }
  | { readonly kind: "opdFan"; readonly opdFanData: OpdFanData }
  | { readonly kind: "spotDiagram"; readonly spotDiagramData: SpotDiagramData }
  | { readonly kind: "geoPSF"; readonly geoPsfData: GeoPsfData }
  | { readonly kind: "wavefrontMap"; readonly wavefrontMapData: WavefrontMapData }
  | { readonly kind: "diffractionPSF"; readonly diffractionPsfData: DiffractionPsfData }
  | { readonly kind: "diffractionMTF"; readonly diffractionMtfData: DiffractionMtfData };

interface LoadAnalysisPlotParams {
  readonly plotType: PlotType;
  readonly proxy: PyodideWorkerAPI | undefined;
  readonly model: OpticalModel | undefined;
  readonly fieldIndex: number;
  readonly wavelengthIndex: number;
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

  if (plotType === "surfaceBySurface3rdOrder") {
    return {
      kind: "surfaceBySurface3rdOrder",
      surfaceBySurface3rdOrderData: (await proxy.get3rdOrderSeidelData(model)).surfaceBySurface,
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

  if (plotType === "diffractionMTF") {
    return {
      kind: "diffractionMTF",
      diffractionMtfData: await proxy.getDiffractionMTFData(model, fieldIndex, wavelengthIndex),
    };
  }
}
