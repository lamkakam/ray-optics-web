import type { StoreApi } from "zustand";
import type { PlotType } from "@/features/analysis/components";
import type { AnalysisDataState } from "@/features/analysis/stores/analysisDataStore";
import type { AnalysisPlotState } from "@/features/analysis/stores/analysisPlotStore";
import { commitAnalysisPlotResult, loadAnalysisPlot } from "@/features/analysis/lib/plotFunctions";
import type { LensLayoutImageState } from "@/features/analysis/stores/lensLayoutImageStore";
import type { LensEditorState } from "@/features/lens-editor/stores/lensEditorStore";
import type { SpecsConfiguratorState } from "@/features/lens-editor/stores/specsConfiguratorStore";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import { surfacesToGridRows } from "@/shared/lib/lens-prescription-grid/lib/gridTransform";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import type { ImagePoint } from "@/shared/components/providers/ImagePointProvider";

interface ApplyExampleSystemParams {
  readonly model: OpticalModel;
  readonly proxy: PyodideWorkerAPI | undefined;
  readonly isDark: boolean;
  readonly imagePoint: ImagePoint;
  readonly lensStore: StoreApi<LensEditorState>;
  readonly specsStore: StoreApi<SpecsConfiguratorState>;
  readonly analysisPlotStore: StoreApi<AnalysisPlotState>;
  readonly analysisDataStore: StoreApi<AnalysisDataState>;
  readonly lensLayoutImageStore: StoreApi<LensLayoutImageState>;
}

/**
## Behavior

- Loads `model.specs` into `SpecsConfiguratorState`.
- Converts the optical model surfaces to lens prescription rows with `surfacesToGridRows()`.
- Mirrors `model.setAutoAperture` into the Lens Editor auto-aperture flag.
- Performs the specs, prescription rows, auto-aperture, and loading-flag store updates before awaiting worker computations so callers can route immediately after starting the returned promise.
- Computes first-order data, lens layout image, selected analysis plot data, and Seidel data.
- Passes the app-wide `imagePoint` through to selected OPD-related analysis plot loading.
- Commits first-order data, layout image, plot data, Seidel data, specs, and optical model to their stores.
- Commits selected plot-store-backed analysis results through `commitAnalysisPlotResult(...)`, including diffraction MTF data.
- Leaves surface-by-surface Seidel plot results out of `AnalysisPlotState`; the full Seidel payload is committed to `AnalysisDataState` separately.
- Clears layout and plot loading flags in `finally`.
*/
/**
Reusable application flow for bundled example optical systems.
*/
export async function applyExampleSystem({
  model,
  proxy,
  isDark,
  imagePoint,
  lensStore,
  specsStore,
  analysisPlotStore,
  analysisDataStore,
  lensLayoutImageStore,
}: ApplyExampleSystemParams): Promise<void> {
  if (proxy === undefined) {
    return;
  }

  specsStore.getState().loadFromSpecs(model.specs);
  lensStore.getState().setRows(surfacesToGridRows(model));
  lensStore.getState().setAutoAperture(model.setAutoAperture === "autoAperture");

  lensLayoutImageStore.getState().setLayoutLoading(true);
  analysisPlotStore.getState().setPlotLoading(true);

  try {
    const selectedFieldIndex = analysisPlotStore.getState().selectedFieldIndex;
    const selectedWavelengthIndex = analysisPlotStore.getState().selectedWavelengthIndex;
    const selectedPlotType: PlotType = analysisPlotStore.getState().selectedPlotType;
    const clampedFieldIndex = specsStore.getState().clampFieldIndex(selectedFieldIndex, model.specs);
    const clampedWavelengthIndex = specsStore.getState().clampWavelengthIndex(selectedWavelengthIndex, model.specs);

    analysisPlotStore.getState().setSelectedFieldIndex(clampedFieldIndex, model.specs.field.fields.length);
    analysisPlotStore.getState().setSelectedWavelengthIndex(clampedWavelengthIndex, model.specs.wavelengths.weights.length);

    const [fod, layout, plotResult, seidel] = await Promise.all([
      proxy.getFirstOrderData(model),
      proxy.plotLensLayout(model, isDark),
      loadAnalysisPlot({
        plotType: selectedPlotType,
        proxy,
        model,
        fieldIndex: clampedFieldIndex,
        wavelengthIndex: clampedWavelengthIndex,
        imagePoint,
      }),
      proxy.get3rdOrderSeidelData(model),
    ]);

    analysisDataStore.getState().setFirstOrderData(fod);
    lensLayoutImageStore.getState().setLayoutImage(layout);
    commitAnalysisPlotResult(plotResult, analysisPlotStore);
    analysisDataStore.getState().setSeidelData(seidel);
    specsStore.getState().setCommittedSpecs(model.specs);
    lensStore.getState().setCommittedOpticalModel(model);
  } finally {
    lensLayoutImageStore.getState().setLayoutLoading(false);
    analysisPlotStore.getState().setPlotLoading(false);
  }
}
