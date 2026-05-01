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

interface ApplyExampleSystemParams {
  readonly model: OpticalModel;
  readonly proxy: PyodideWorkerAPI | undefined;
  readonly isDark: boolean;
  readonly lensStore: StoreApi<LensEditorState>;
  readonly specsStore: StoreApi<SpecsConfiguratorState>;
  readonly analysisPlotStore: StoreApi<AnalysisPlotState>;
  readonly analysisDataStore: StoreApi<AnalysisDataState>;
  readonly lensLayoutImageStore: StoreApi<LensLayoutImageState>;
}

export async function applyExampleSystem({
  model,
  proxy,
  isDark,
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
