/**
# `features/analysis/lib/plotFunctions.ts`

## Purpose

Shared utility that maps `PlotType` values to Pyodide worker proxy calls and commits typed plot load results into the analysis plot store. Eliminates duplication between `LensEditor.tsx`, `applyExampleSystem.ts`, and `AnalysisPlotContainer.tsx`.

## Dependencies

- `OpticalModel` (type-only) from `@/shared/lib/types/opticalModel`
- `PlotType` (type-only) from `@/features/analysis/components`
- `RayFanData`, `FieldCurveData`, `AstigmatismCurveData`, `DiffractionPsfData`, `DiffractionMtfData`, `StrehlVsWavelengthData`, and `WavefrontMapData` (type-only) from `@/features/analysis/types/plotData`
- `SeidelSurfaceBySurfaceData` (type-only) from `@/features/lens-editor/types/seidelData`
- `PyodideWorkerAPI` (type-only) from `@/shared/hooks/usePyodide`
- `StoreApi` (type-only) from `zustand`
- `AnalysisPlotState` (type-only) from `@/features/analysis/stores/analysisPlotStore`

- Used in `LensEditor.tsx` after "Update System" completes.
- Used in `applyExampleSystem.ts` after bundled example-system computation completes.
- Used in `AnalysisPlotContainer.tsx` when field/wavelength/plot-type changes.
- `loadAnalysisPlot(...)` is the preferred API for any code path that needs the correct worker call for every `PlotType`.
- `commitAnalysisPlotResult(...)` is the preferred API for storing every plot-store-backed `AnalysisPlotLoadResult`.*/
import type { StoreApi } from "zustand";
import type { PlotType } from "@/features/analysis/components";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import type { AstigmatismCurveData, DiffractionMtfData, DiffractionPsfData, FieldCurveData, GeoPsfData, LongitudinalSphericalAberrationData, OpdFanData, RayFanData, SpotDiagramData, StrehlVsWavelengthData, WavefrontMapData } from "@/features/analysis/types/plotData";
import type { SeidelSurfaceBySurfaceData } from "@/features/lens-editor/types/seidelData";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import type { AnalysisPlotState } from "@/features/analysis/stores/analysisPlotStore";
import type { ImagePoint } from "@/shared/components/providers/ImagePointProvider";

/**
Discriminated result returned by the shared analysis-plot loader. It makes the worker-call branching explicit so callers can store typed chart data without duplicating plot-type conditionals.
*/
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
Shared async loader used by both `LensEditor.tsx` and `AnalysisPlotContainer.tsx`.

- Returns `undefined` when `proxy` or `model` is missing.
- Calls `proxy.getRayFanData(model, fi, imagePoint)` for `rayFan`.
- Calls `proxy.get3rdOrderSeidelData(model)` for `surfaceBySurface3rdOrder` and returns `surfaceBySurface`.
- Calls `proxy.getOpdFanData(model, fi, imagePoint)` for `opdFan`.
- Calls `proxy.getSpotDiagramData(model, fi, imagePoint)` for `spotDiagram`.
- Calls `proxy.getFieldCurvatureData(model, wavelengthIndex)` for `fieldCurvature`.
- Calls `proxy.getAstigmatismCurveData(model, wavelengthIndex)` for `astigmatismCurve`.
- Calls `proxy.getLSAData(model)` for `longitudinalSphericalAberration`; the worker returns all wavelength series, so no field or wavelength selector index is used.
- Calls `proxy.getWavefrontData(...)` with `imagePoint` for `wavefrontMap`.
- Calls `proxy.getStrehlVsWavelengthData(...)` with `imagePoint` for `strehlVsWavelength`.
- Calls `proxy.getGeoPSFData(...)` for `geoPSF`.
- Calls `proxy.getDiffractionPSFData(...)` with `imagePoint` for `diffractionPSF`.
- Calls `proxy.getDiffractionMTFData(...)` with `imagePoint` for `diffractionMTF`.
- Centralizes the plot-type to worker-API mapping so submit-time updates and in-panel plot changes stay consistent.
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

  if (plotType === "rayFan") {
    return {
      kind: "rayFan",
      rayFanData: await proxy.getRayFanData(model, fieldIndex, imagePoint),
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
      wavefrontMapData: await proxy.getWavefrontData(model, fieldIndex, wavelengthIndex, imagePoint),
    };
  }

  if (plotType === "strehlVsWavelength") {
    return {
      kind: "strehlVsWavelength",
      strehlVsWavelengthData: await proxy.getStrehlVsWavelengthData(model, fieldIndex, imagePoint),
    };
  }

  if (plotType === "opdFan") {
    return {
      kind: "opdFan",
      opdFanData: await proxy.getOpdFanData(model, fieldIndex, imagePoint),
    };
  }

  if (plotType === "spotDiagram") {
    return {
      kind: "spotDiagram",
      spotDiagramData: await proxy.getSpotDiagramData(model, fieldIndex, imagePoint),
    };
  }

  if (plotType === "fieldCurvature") {
    return {
      kind: "fieldCurvature",
      fieldCurvatureData: await proxy.getFieldCurvatureData(model, wavelengthIndex),
    };
  }

  if (plotType === "astigmatismCurve") {
    return {
      kind: "astigmatismCurve",
      astigmatismCurveData: await proxy.getAstigmatismCurveData(model, wavelengthIndex),
    };
  }

  if (plotType === "longitudinalSphericalAberration") {
    return {
      kind: "longitudinalSphericalAberration",
      longitudinalSphericalAberrationData: await proxy.getLSAData(model),
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
      diffractionPsfData: await proxy.getDiffractionPSFData(model, fieldIndex, wavelengthIndex, imagePoint),
    };
  }

  if (plotType === "diffractionMTF") {
    return {
      kind: "diffractionMTF",
      diffractionMtfData: await proxy.getDiffractionMTFData(model, fieldIndex, wavelengthIndex, imagePoint),
    };
  }
}

/**
Commits a loaded analysis plot payload to the matching `AnalysisPlotState` setter.

- No-ops when `plotResult` is `undefined`.
- No-ops for `"surfaceBySurface3rdOrder"` because Seidel surface-by-surface data is committed through `AnalysisDataState`.
- Calls the matching plot-store setter for `"rayFan"`, `"opdFan"`, `"spotDiagram"`, `"fieldCurvature"`, `"astigmatismCurve"`, `"longitudinalSphericalAberration"`, `"geoPSF"`, `"wavefrontMap"`, `"strehlVsWavelength"`, `"diffractionPSF"`, and `"diffractionMTF"`.
- Uses an exhaustive `switch` so future `AnalysisPlotLoadResult` variants must be handled explicitly.
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
      return exhaustive;
    }
  }
}
