/**
 * Throwing Lens Editor computation core shared by the visible Update System
 * action and imperative WebMCP tools. All worker requests resolve before any
 * committed store is changed, so a failed computation leaves the previous
 * analyses, model, specs, selection, and auto-aperture cache intact.
 */
import type { StoreApi } from "zustand";
import type { GlassLookupMaps } from "@/features/glass-map/types/glassMap";
import {
  commitAnalysisPlotResult,
  loadAnalysisPlot,
  loadFirstOrderData,
  loadSeidelData,
} from "@/features/analysis/lib/plotFunctions";
import type { AnalysisDataState } from "@/features/analysis/stores/analysisDataStore";
import type { AnalysisPlotState } from "@/features/analysis/stores/analysisPlotStore";
import type { LensLayoutImageState } from "@/features/analysis/stores/lensLayoutImageStore";
import type { PlotType } from "@/features/analysis/components";
import type { LensEditorState } from "@/features/lens-editor/stores/lensEditorStore";
import type { SpecsConfiguratorState } from "@/features/lens-editor/stores/specsConfiguratorStore";
import {
  formatMissingGlassMessage,
  getMissingPrescriptionGlasses,
} from "@/shared/lib/lens-prescription-grid/lib/glassValidation";
import { gridRowsToSurfaces } from "@/shared/lib/lens-prescription-grid/lib/gridTransform";
import type { GridRow } from "@/shared/lib/lens-prescription-grid/types/gridTypes";
import type {
  OpticalModel,
  OpticalSpecs,
} from "@/shared/lib/types/opticalModel";
import type { ImagePoint } from "@/shared/components/providers/ImagePointProvider";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import { mapPhysicalSurfaceSemiDiameters } from "@/features/lens-editor/lib/autoSemiDiameters";
import { assertWebMcpNotCancelled } from "@/features/lens-editor/lib/webMcpValidation";

/** Error used by the UI wrapper to preserve its local missing-glass modal. */
export class MissingPrescriptionGlassError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MissingPrescriptionGlassError";
  }
}

/** Type guard for the validation error that the page handles locally. */
export function isMissingPrescriptionGlassError(
  error: unknown,
): error is MissingPrescriptionGlassError {
  return error instanceof MissingPrescriptionGlassError;
}

/** Current draft model and its row snapshot used by one computation attempt. */
export interface DraftOpticalSystem {
  readonly model: OpticalModel;
  readonly specs: OpticalSpecs;
  readonly submittedRows: readonly GridRow[];
  readonly autoAperture: boolean;
}

/** Builds the OpticalModel represented by the current editor draft stores. */
export function buildDraftOpticalModel(
  lensStore: StoreApi<LensEditorState>,
  specsStore: StoreApi<SpecsConfiguratorState>,
): DraftOpticalSystem {
  const autoAperture = lensStore.getState().autoAperture;
  const setAutoAperture = autoAperture
    ? ("autoAperture" as const)
    : ("manualAperture" as const);
  const specs = specsStore.getState().toOpticalSpecs();
  const submittedRows = lensStore.getState().rows;
  const surfacesData = gridRowsToSurfaces(submittedRows);
  return {
    model: { setAutoAperture, specs, ...surfacesData },
    specs,
    submittedRows,
    autoAperture,
  };
}

/** Dependencies for one complete, atomic optical-system computation. */
export interface OpticalSystemComputationDependencies {
  readonly proxy: PyodideWorkerAPI | undefined;
  readonly lensStore: StoreApi<LensEditorState>;
  readonly specsStore: StoreApi<SpecsConfiguratorState>;
  readonly analysisPlotStore: StoreApi<AnalysisPlotState>;
  readonly analysisDataStore: StoreApi<AnalysisDataState>;
  readonly lensLayoutImageStore: StoreApi<LensLayoutImageState>;
  readonly lookupMaps: GlassLookupMaps | undefined;
  readonly selectedFieldIndex: number;
  readonly selectedWavelengthIndex: number;
  readonly selectedPlotType: PlotType;
  readonly isDark: boolean;
  readonly imagePoint?: ImagePoint;
  readonly signal?: AbortSignal;
}

/** Successful computation data available to callers after all stores commit. */
export interface OpticalSystemComputationResult {
  readonly model: OpticalModel;
  readonly specs: OpticalSpecs;
  readonly surfaceCount: number;
}

/**
 * Validates and computes the draft model, then commits every result atomically
 * from the application’s point of view.
 *
 * @throws `MissingPrescriptionGlassError` when the existing pre-compute glass
 * validation finds unknown named media; worker and analysis failures propagate.
 * A cancelled signal is checked before reads, after all worker requests, and
 * immediately before the first store mutation.
 */
export async function computeOpticalSystem({
  proxy,
  lensStore,
  specsStore,
  analysisPlotStore,
  analysisDataStore,
  lensLayoutImageStore,
  lookupMaps,
  selectedFieldIndex,
  selectedWavelengthIndex,
  selectedPlotType,
  isDark,
  imagePoint,
  signal,
}: OpticalSystemComputationDependencies): Promise<OpticalSystemComputationResult> {
  assertWebMcpNotCancelled(signal);
  if (proxy === undefined) throw new Error("Pyodide not ready");

  const draft = buildDraftOpticalModel(lensStore, specsStore);
  const missingGlassMessage = formatMissingGlassMessage(
    getMissingPrescriptionGlasses(draft.model, lookupMaps),
  );
  if (missingGlassMessage !== undefined) {
    throw new MissingPrescriptionGlassError(missingGlassMessage);
  }

  const clampedFieldIndex = specsStore
    .getState()
    .clampFieldIndex(selectedFieldIndex, draft.specs);
  const clampedWavelengthIndex = specsStore
    .getState()
    .clampWavelengthIndex(selectedWavelengthIndex, draft.specs);

  const [firstOrderData, layoutImage, plotResult, seidelData, sequential] =
    await Promise.all([
      loadFirstOrderData({ proxy, model: draft.model, imagePoint }),
      proxy.plotLensLayout(draft.model, isDark),
      loadAnalysisPlot({
        plotType: selectedPlotType,
        proxy,
        model: draft.model,
        fieldIndex: clampedFieldIndex,
        wavelengthIndex: clampedWavelengthIndex,
        imagePoint,
      }),
      loadSeidelData({ proxy, model: draft.model, imagePoint }),
      draft.autoAperture
        ? proxy.getSurfaceSemiDiameters(draft.model)
        : Promise.resolve(undefined),
    ]);

  assertWebMcpNotCancelled(signal);
  const autoSemiDiameters =
    sequential === undefined
      ? undefined
      : mapPhysicalSurfaceSemiDiameters(draft.submittedRows, sequential);
  assertWebMcpNotCancelled(signal);

  analysisPlotStore
    .getState()
    .setSelectedFieldIndex(clampedFieldIndex, draft.specs.field.fields.length);
  analysisPlotStore
    .getState()
    .setSelectedWavelengthIndex(
      clampedWavelengthIndex,
      draft.specs.wavelengths.weights.length,
    );
  analysisDataStore.getState().setFirstOrderData(firstOrderData);
  lensLayoutImageStore.getState().setLayoutImage(layoutImage);
  commitAnalysisPlotResult(plotResult, analysisPlotStore);
  analysisDataStore.getState().setSeidelData(seidelData);
  specsStore.getState().setCommittedSpecs(draft.specs);
  lensStore.getState().setCommittedOpticalModel(draft.model);
  if (autoSemiDiameters === undefined) {
    lensStore.getState().clearAutoSemiDiameters();
  } else {
    lensStore.getState().setAutoSemiDiameters(autoSemiDiameters);
  }

  return {
    model: draft.model,
    specs: draft.specs,
    surfaceCount: draft.model.surfaces.length,
  };
}
