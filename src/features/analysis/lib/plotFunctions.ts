/**
 * Central cached analysis loading, plot-type dispatch, and typed result commits
 * shared by editor submission, example-system application, and interactive
 * analysis-panel changes.
 */
import type { StoreApi } from "zustand";
import type { PlotType } from "@/features/analysis/components";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import type { AstigmatismCurveData, DiffractionMtfData, DiffractionPsfData, FieldCurveData, GeoPsfData, LongitudinalSphericalAberrationData, OpdFanData, RayFanData, SpotDiagramData, StrehlVsWavelengthData, WavefrontMapData } from "@/features/analysis/types/plotData";
import type { SeidelSurfaceBySurfaceData } from "@/features/lens-editor/types/seidelData";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import type { AnalysisPlotState } from "@/features/analysis/stores/analysisPlotStore";
import type { ImagePoint } from "@/shared/components/providers/ImagePointProvider";
import type { ZernikeData, ZernikeOrdering, ZernikePupilSpace } from "@/features/lens-editor/types/zernikeData";
import type { SeidelData } from "@/features/lens-editor/types/seidelData";
import { getCachedAnalysis } from "@/features/analysis/lib/analysisCache";

/** Discriminated result returned by the shared analysis-plot loader. It makes the worker-call branching explicit so callers can store typed chart data without duplicating plot-type conditionals. */
export type AnalysisPlotLoadResult =
  | { readonly kind: "surfaceBySurface3rdOrder"; readonly surfaceBySurface3rdOrderData: SeidelSurfaceBySurfaceData }
  | { readonly kind: "rayFan"; readonly rayFanData: RayFanData }
  | { readonly kind: "opdFan"; readonly opdFanData: OpdFanData }
  | { readonly kind: "spotDiagram"; readonly spotDiagramData: SpotDiagramData }
  | { readonly kind: "fieldCurvature"; readonly fieldCurvatureData: FieldCurveData }
  | { readonly kind: "astigmatismCurve"; readonly astigmatismCurveData: AstigmatismCurveData }
  | { readonly kind: "longitudinalSphericalAberration"; readonly longitudinalSphericalAberrationData: LongitudinalSphericalAberrationData }
  | { readonly kind: "geoPSF"; readonly geoPsfData: GeoPsfData }
  | { readonly kind: "wavefrontMap"; readonly wavefrontMapData: WavefrontMapData }
  | { readonly kind: "strehlVsWavelength"; readonly strehlVsWavelengthData: StrehlVsWavelengthData }
  | { readonly kind: "diffractionPSF"; readonly diffractionPsfData: DiffractionPsfData }
  | { readonly kind: "diffractionMTF"; readonly diffractionMtfData: DiffractionMtfData };

interface LoadAnalysisPlotParams {
  readonly plotType: PlotType;
  readonly proxy: PyodideWorkerAPI | undefined;
  readonly model: OpticalModel | undefined;
  readonly fieldIndex: number;
  readonly wavelengthIndex: number;
  readonly imagePoint?: ImagePoint;
}

/**
 * Shared async loader used by both `LensEditor.tsx` and `AnalysisPlotContainer.tsx`.
 *
 * @remarks
 * - Returns `undefined` when `proxy` or `model` is missing.
 * - Calls `proxy.getRayFanData(model, fi, imagePoint)` for `rayFan`.
 * - Calls `proxy.get3rdOrderSeidelData(model)` for `surfaceBySurface3rdOrder` and returns `surfaceBySurface`.
 * - Calls `proxy.getOpdFanData(model, fi, imagePoint)` for `opdFan`.
 * - Calls `proxy.getSpotDiagramData(model, fi, imagePoint)` for `spotDiagram`.
 * - Calls `proxy.getFieldCurvatureData(model, wavelengthIndex)` for `fieldCurvature`.
 * - Calls `proxy.getAstigmatismCurveData(model, wavelengthIndex)` for `astigmatismCurve`.
 * - Calls `proxy.getLSAData(model)` for `longitudinalSphericalAberration`; the worker returns all wavelength series, so no field or wavelength selector index is used.
 * - Calls `proxy.getWavefrontData(...)` with `imagePoint` for `wavefrontMap`.
 * - Calls `proxy.getStrehlVsWavelengthData(...)` with `imagePoint` for `strehlVsWavelength`.
 * - Calls `proxy.getGeoPSFData(...)` for `geoPSF`.
 * - Calls `proxy.getDiffractionPSFData(...)` with `imagePoint` for `diffractionPSF`.
 * - Calls `proxy.getDiffractionMTFData(...)` with `imagePoint` for `diffractionMTF`.
 * - Centralizes the plot-type to worker-API mapping so submit-time updates and in-panel plot changes stay consistent.
 * - Caches serialized worker promises by exact model instance, image point, plot type, and only the selectors relevant to that plot.
 * - Shares the complete cached Seidel request with `surfaceBySurface3rdOrder`.
 */
export async function loadAnalysisPlot({
  plotType,
  proxy,
  model,
  fieldIndex,
  wavelengthIndex,
  imagePoint = "chief_ray",
}: LoadAnalysisPlotParams): Promise<AnalysisPlotLoadResult | undefined> {
  if (!proxy || !model) return undefined;

  const cached = <T>(requestKey: string, load: () => Promise<T>): Promise<T> =>
    getCachedAnalysis(model, imagePoint, requestKey, load);

  if (plotType === "rayFan") {
    return {
      kind: "rayFan",
      rayFanData: await cached(`rayFan:${fieldIndex}`, () => proxy.getRayFanData(model, fieldIndex, imagePoint)),
    };
  }

  if (plotType === "surfaceBySurface3rdOrder") {
    return {
      kind: "surfaceBySurface3rdOrder",
      surfaceBySurface3rdOrderData: (await loadSeidelData({ proxy, model, imagePoint })).surfaceBySurface,
    };
  }

  if (plotType === "wavefrontMap") {
    return {
      kind: "wavefrontMap",
      wavefrontMapData: await cached(`wavefrontMap:${fieldIndex}:${wavelengthIndex}`, () => proxy.getWavefrontData(model, fieldIndex, wavelengthIndex, imagePoint)),
    };
  }

  if (plotType === "strehlVsWavelength") {
    return {
      kind: "strehlVsWavelength",
      strehlVsWavelengthData: await cached(`strehlVsWavelength:${fieldIndex}`, () => proxy.getStrehlVsWavelengthData(model, fieldIndex, imagePoint)),
    };
  }

  if (plotType === "opdFan") {
    return {
      kind: "opdFan",
      opdFanData: await cached(`opdFan:${fieldIndex}`, () => proxy.getOpdFanData(model, fieldIndex, imagePoint)),
    };
  }

  if (plotType === "spotDiagram") {
    return {
      kind: "spotDiagram",
      spotDiagramData: await cached(`spotDiagram:${fieldIndex}`, () => proxy.getSpotDiagramData(model, fieldIndex, imagePoint)),
    };
  }

  if (plotType === "fieldCurvature") {
    return {
      kind: "fieldCurvature",
      fieldCurvatureData: await cached(`fieldCurvature:${wavelengthIndex}`, () => proxy.getFieldCurvatureData(model, wavelengthIndex)),
    };
  }

  if (plotType === "astigmatismCurve") {
    return {
      kind: "astigmatismCurve",
      astigmatismCurveData: await cached(`astigmatismCurve:${wavelengthIndex}`, () => proxy.getAstigmatismCurveData(model, wavelengthIndex)),
    };
  }

  if (plotType === "longitudinalSphericalAberration") {
    return {
      kind: "longitudinalSphericalAberration",
      longitudinalSphericalAberrationData: await cached("longitudinalSphericalAberration", () => proxy.getLSAData(model)),
    };
  }

  if (plotType === "geoPSF") {
    return {
      kind: "geoPSF",
      geoPsfData: await cached(`geoPSF:${fieldIndex}:${wavelengthIndex}`, () => proxy.getGeoPSFData(model, fieldIndex, wavelengthIndex)),
    };
  }

  if (plotType === "diffractionPSF") {
    return {
      kind: "diffractionPSF",
      diffractionPsfData: await cached(`diffractionPSF:${fieldIndex}:${wavelengthIndex}`, () => proxy.getDiffractionPSFData(model, fieldIndex, wavelengthIndex, imagePoint)),
    };
  }

  if (plotType === "diffractionMTF") {
    return {
      kind: "diffractionMTF",
      diffractionMtfData: await cached(`diffractionMTF:${fieldIndex}:${wavelengthIndex}`, () => proxy.getDiffractionMTFData(model, fieldIndex, wavelengthIndex, imagePoint)),
    };
  }
}

interface LoadSharedAnalysisParams {
  readonly proxy: PyodideWorkerAPI;
  readonly model: OpticalModel;
  readonly imagePoint?: ImagePoint;
}

/** Loads first-order data, partitioned by aim point despite being mathematically aim-independent. */
export function loadFirstOrderData({ proxy, model, imagePoint = "chief_ray" }: LoadSharedAnalysisParams): Promise<Record<string, number>> {
  return getCachedAnalysis(model, imagePoint, "firstOrder", () => proxy.getFirstOrderData(model));
}

/** Loads the complete Seidel payload shared with the surface-by-surface plot. */
export function loadSeidelData({ proxy, model, imagePoint = "chief_ray" }: LoadSharedAnalysisParams): Promise<SeidelData> {
  return getCachedAnalysis(model, imagePoint, "seidel", () => proxy.get3rdOrderSeidelData(model));
}

interface LoadZernikeDataParams extends LoadSharedAnalysisParams {
  readonly fieldIndex: number;
  readonly wavelengthIndex: number;
  readonly ordering: ZernikeOrdering;
  readonly numTerms: number;
  readonly pupilSpace?: ZernikePupilSpace;
}

/** Loads one complete Zernike payload keyed by all selectors, defaulting to Entrance pupil space. */
export function loadZernikeData({ proxy, model, fieldIndex, wavelengthIndex, imagePoint = "chief_ray", ordering, numTerms, pupilSpace = "entrance" }: LoadZernikeDataParams): Promise<ZernikeData> {
  return getCachedAnalysis(
    model,
    imagePoint,
    `zernike:${fieldIndex}:${wavelengthIndex}:${ordering}:${numTerms}:${pupilSpace}`,
    () => proxy.getZernikeCoefficients(model, fieldIndex, wavelengthIndex, imagePoint, numTerms, ordering, pupilSpace),
  );
}

/**
 * Commits a loaded analysis plot payload to the matching `AnalysisPlotState` setter.
 *
 * @remarks
 * - No-ops when `plotResult` is `undefined`.
 * - No-ops for `"surfaceBySurface3rdOrder"` because Seidel surface-by-surface data is committed through `AnalysisDataState`.
 * - Calls the matching plot-store setter for `"rayFan"`, `"opdFan"`, `"spotDiagram"`, `"fieldCurvature"`, `"astigmatismCurve"`, `"longitudinalSphericalAberration"`, `"geoPSF"`, `"wavefrontMap"`, `"strehlVsWavelength"`, `"diffractionPSF"`, and `"diffractionMTF"`.
 * - Uses an exhaustive `switch` so future `AnalysisPlotLoadResult` variants must be handled explicitly.
 */
export function commitAnalysisPlotResult(
  plotResult: AnalysisPlotLoadResult | undefined,
  analysisPlotStore: StoreApi<AnalysisPlotState>,
): void {
  if (plotResult === undefined) return;

  switch (plotResult.kind) {
    case "surfaceBySurface3rdOrder":
      return;
    case "rayFan":
      analysisPlotStore.getState().setRayFanData(plotResult.rayFanData);
      return;
    case "opdFan":
      analysisPlotStore.getState().setOpdFanData(plotResult.opdFanData);
      return;
    case "spotDiagram":
      analysisPlotStore.getState().setSpotDiagramData(plotResult.spotDiagramData);
      return;
    case "fieldCurvature":
      analysisPlotStore.getState().setFieldCurvatureData(plotResult.fieldCurvatureData);
      return;
    case "astigmatismCurve":
      analysisPlotStore.getState().setAstigmatismCurveData(plotResult.astigmatismCurveData);
      return;
    case "longitudinalSphericalAberration":
      analysisPlotStore.getState().setLongitudinalSphericalAberrationData(plotResult.longitudinalSphericalAberrationData);
      return;
    case "geoPSF":
      analysisPlotStore.getState().setGeoPsfData(plotResult.geoPsfData);
      return;
    case "wavefrontMap":
      analysisPlotStore.getState().setWavefrontMapData(plotResult.wavefrontMapData);
      return;
    case "strehlVsWavelength":
      analysisPlotStore.getState().setStrehlVsWavelengthData(plotResult.strehlVsWavelengthData);
      return;
    case "diffractionPSF":
      analysisPlotStore.getState().setDiffractionPsfData(plotResult.diffractionPsfData);
      return;
    case "diffractionMTF":
      analysisPlotStore.getState().setDiffractionMtfData(plotResult.diffractionMtfData);
      return;
    default: {
      const exhaustive: never = plotResult;
      throw new Error(`Unsupported analysis plot result: ${String(exhaustive)}`);
    }
  }
}
