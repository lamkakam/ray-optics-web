"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { proxy as comlinkProxy } from "comlink";
import { useStore } from "zustand";
import { BottomDrawer, type TabItem } from "@/shared/components/layout/BottomDrawer";
import { useLensEditorStore } from "@/features/lens-editor/providers/LensEditorStoreProvider";
import { useSpecsConfiguratorStore } from "@/features/lens-editor/providers/SpecsConfiguratorStoreProvider";
import { useOptimizationStore } from "@/features/optimization/providers/OptimizationStoreProvider";
import { OptimizationActionBar } from "@/features/optimization/components/OptimizationActionBar";
import { OptimizationAlgorithmTab } from "@/features/optimization/components/OptimizationAlgorithmTab";
import { OptimizationApplyConfirmModal } from "@/features/optimization/components/OptimizationApplyConfirmModal";
import { OptimizationEvaluationPanel } from "@/features/optimization/components/OptimizationEvaluationPanel";
import { OptimizationInspectionModals } from "@/features/optimization/components/OptimizationInspectionModals";
import { OptimizationLensPrescriptionGrid } from "@/features/optimization/components/OptimizationLensPrescriptionGrid";
import { OptimizationOperandsTab } from "@/features/optimization/components/OptimizationOperandsTab";
import { OptimizationProgressModal } from "@/features/optimization/components/OptimizationProgressModal";
import { OptimizationWarningModal } from "@/features/optimization/components/OptimizationWarningModal";
import { OptimizationWeightsGrid } from "@/features/optimization/components/OptimizationWeightsGrid";
import { RadiusModeModal } from "@/features/optimization/components/RadiusModeModal";
import { ThicknessModeModal } from "@/features/optimization/components/ThicknessModeModal";
import { hasNonZeroOptimizationContribution } from "@/features/optimization/stores/optimizationStore";
import { createEvaluationRow, type RadiusRow, type WeightRow } from "@/features/optimization/components/optimizationViewModels";
import { surfacesToGridRows, gridRowsToSurfaces } from "@/shared/lib/utils/gridTransform";
import type { GridRow } from "@/shared/lib/types/gridTypes";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import type { OptimizationProgressEntry, OptimizationReport } from "@/shared/lib/types/optimization";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import { useScreenBreakpoint } from "@/shared/hooks/useScreenBreakpoint";

interface OptimizationPageProps {
  readonly proxy: PyodideWorkerAPI | undefined;
  readonly isReady: boolean;
  readonly onError: () => void;
  readonly onApplyToEditor?: (model: OpticalModel) => Promise<void> | void;
}

const ZERO_WEIGHT_WARNING_MESSAGE = "At least one effective optimization weight must be non-zero.";
const LG_EVALUATION_RESERVED_HEIGHT_FALLBACK = 333;

function buildCurrentEditorModel(lensStore: ReturnType<typeof useLensEditorStore>, specsStore: ReturnType<typeof useSpecsConfiguratorStore>) {
  const autoAperture = lensStore.getState().autoAperture;
  const setAutoAperture = autoAperture ? "autoAperture" as const : "manualAperture" as const;
  const specs = specsStore.getState().toOpticalSpecs();
  const surfaces = gridRowsToSurfaces(lensStore.getState().rows);
  return { setAutoAperture, specs, ...surfaces };
}

export function OptimizationPage({
  proxy,
  isReady,
  onError,
  onApplyToEditor,
}: OptimizationPageProps) {
  const defaultLgDrawerHeight = typeof window === "undefined"
    ? 300
    : Math.round(window.innerHeight * 0.4);
  const screenSize = useScreenBreakpoint();
  const isLG = screenSize === "screenLG";
  const lensStore = useLensEditorStore();
  const specsStore = useSpecsConfiguratorStore();
  const optimizationStore = useOptimizationStore();
  const editorRows = useStore(lensStore, (state) => state.rows);
  const editorAutoAperture = useStore(lensStore, (state) => state.autoAperture);
  const pupilSpace = useStore(specsStore, (state) => state.pupilSpace);
  const pupilType = useStore(specsStore, (state) => state.pupilType);
  const pupilValue = useStore(specsStore, (state) => state.pupilValue);
  const fieldSpace = useStore(specsStore, (state) => state.fieldSpace);
  const fieldType = useStore(specsStore, (state) => state.fieldType);
  const maxField = useStore(specsStore, (state) => state.maxField);
  const relativeFields = useStore(specsStore, (state) => state.relativeFields);
  const isWideAngle = useStore(specsStore, (state) => state.isWideAngle);
  const wavelengthWeightsFromEditor = useStore(specsStore, (state) => state.wavelengthWeights);
  const referenceIndex = useStore(specsStore, (state) => state.referenceIndex);

  const activeTabId = useStore(optimizationStore, (state) => state.activeTabId);
  const optimizationModel = useStore(optimizationStore, (state) => state.optimizationModel);
  const optimizer = useStore(optimizationStore, (state) => state.optimizer);
  const fieldWeights = useStore(optimizationStore, (state) => state.fieldWeights);
  const wavelengthWeights = useStore(optimizationStore, (state) => state.wavelengthWeights);
  const radiusModes = useStore(optimizationStore, (state) => state.radiusModes);
  const operands = useStore(optimizationStore, (state) => state.operands);
  const hasNonZeroContribution = useStore(optimizationStore, (state) => {
    try {
      return hasNonZeroOptimizationContribution(state.buildOptimizationConfig());
    } catch {
      return true;
    }
  });
  const isOptimizing = useStore(optimizationStore, (state) => state.isOptimizing);
  const warningModal = useStore(optimizationStore, (state) => state.warningModal);
  const applyConfirmOpen = useStore(optimizationStore, (state) => state.applyConfirmOpen);
  const radiusModal = useStore(optimizationStore, (state) => state.radiusModal);
  const thicknessModal = useStore(optimizationStore, (state) => state.thicknessModal);
  const thicknessModes = useStore(optimizationStore, (state) => state.thicknessModes);
  const [mediumModalRow, setMediumModalRow] = useState<GridRow | undefined>();
  const [asphericalModalRow, setAsphericalModalRow] = useState<GridRow | undefined>();
  const [decenterModalRow, setDecenterModalRow] = useState<GridRow | undefined>();
  const [diffractionGratingModalRow, setDiffractionGratingModalRow] = useState<GridRow | undefined>();
  const [evaluationReport, setEvaluationReport] = useState<OptimizationReport | undefined>();
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [optimizationProgress, setOptimizationProgress] = useState<ReadonlyArray<OptimizationProgressEntry>>([]);
  const [optimizationProgressModalOpen, setOptimizationProgressModalOpen] = useState(false);
  const [optimizationRunComplete, setOptimizationRunComplete] = useState(false);
  const [liveDrawerHeight, setLiveDrawerHeight] = useState(defaultLgDrawerHeight);
  const [pageShellHeight, setPageShellHeight] = useState(0);
  const pageShellRef = useRef<HTMLDivElement | null>(null);
  const sharedContentRef = useRef<HTMLDivElement | null>(null);
  const evaluationPanelRef = useRef<HTMLDivElement | null>(null);
  const evaluationRequestIdRef = useRef(0);
  const initializedForMountRef = useRef(false);

  useLayoutEffect(() => {
    if (!isLG) {
      return;
    }

    const pageShell = pageShellRef.current;
    if (pageShell === null) {
      return;
    }

    const updatePageShellHeight = () => {
      const nextHeight = Math.round(pageShell.getBoundingClientRect().height);
      setPageShellHeight(nextHeight);
    };

    updatePageShellHeight();
    const resizeObserver = new ResizeObserver(updatePageShellHeight);
    resizeObserver.observe(pageShell);

    return () => {
      resizeObserver.disconnect();
    };
  }, [isLG]);

  useEffect(() => {
    const currentEditorModel = buildCurrentEditorModel(lensStore, specsStore);
    if (!initializedForMountRef.current) {
      initializedForMountRef.current = true;
      optimizationStore.getState().initializeFromOpticalModel(currentEditorModel);
      return;
    }

    optimizationStore.getState().syncFromOpticalModel(currentEditorModel);
  }, [
    editorRows,
    editorAutoAperture,
    pupilSpace,
    pupilType,
    pupilValue,
    fieldSpace,
    fieldType,
    maxField,
    relativeFields,
    isWideAngle,
    wavelengthWeightsFromEditor,
    referenceIndex,
    lensStore,
    optimizationStore,
    specsStore,
  ]);

  const fieldRows = useMemo<WeightRow[]>(() => {
    if (optimizationModel === undefined) {
      return [];
    }

    const unit = optimizationModel.specs.field.type === "angle" ? "°" : " mm";
    return optimizationModel.specs.field.fields.map((field, index) => ({
      id: `field-${index}`,
      index,
      label: `${(field * optimizationModel.specs.field.maxField).toPrecision(3)}${unit}`,
      weight: fieldWeights[index] ?? 1,
    }));
  }, [fieldWeights, optimizationModel]);

  const wavelengthRows = useMemo<WeightRow[]>(() => {
    if (optimizationModel === undefined) {
      return [];
    }

    return optimizationModel.specs.wavelengths.weights.map(([wavelength], index) => ({
      id: `wavelength-${index}`,
      index,
      label: `${wavelength} nm`,
      weight: wavelengthWeights[index] ?? 1,
    }));
  }, [optimizationModel, wavelengthWeights]);

  const radiusRows = useMemo<RadiusRow[]>(() => {
    if (optimizationModel === undefined) {
      return [];
    }

    return surfacesToGridRows(optimizationModel).map((row, index) => ({
      id: `optimization-row-${index}`,
      radiusSurfaceIndex: index === 0 ? undefined : index,
      thicknessSurfaceIndex: row.kind === "surface" ? index : undefined,
      row,
    }));
  }, [optimizationModel]);

  const selectedRadiusMode = radiusModal.surfaceIndex === undefined
    ? undefined
    : radiusModes.find((mode) => mode.surfaceIndex === radiusModal.surfaceIndex);

  const selectedThicknessMode = thicknessModal.surfaceIndex === undefined
    ? undefined
    : thicknessModes.find((mode) => mode.surfaceIndex === thicknessModal.surfaceIndex);

  const evaluationRows = useMemo(
    () => evaluationReport?.residuals.flatMap((residual, index) => {
      const row = createEvaluationRow(residual, index);
      return row === undefined ? [] : [row];
    }) ?? [],
    [evaluationReport],
  );

  const evaluationTableRows = useMemo(
    () => evaluationRows.map((row) => [row.operandType, row.target, row.weight, row.value] as const),
    [evaluationRows],
  );

  const canOptimize = isReady
    && proxy !== undefined
    && optimizationModel !== undefined
    && hasNonZeroContribution;

  const evaluationReservedHeight = !isLG
    ? undefined
    : (() => {
      const sharedContentHeight = sharedContentRef.current?.getBoundingClientRect().height ?? 0;
      const evaluationPanelHeight = evaluationPanelRef.current?.getBoundingClientRect().height ?? 0;
      const measuredReservedHeight = sharedContentHeight > 0 && evaluationPanelHeight > 0
        ? Math.round(sharedContentHeight - evaluationPanelHeight)
        : 0;

      return measuredReservedHeight > 0
        ? measuredReservedHeight
        : LG_EVALUATION_RESERVED_HEIGHT_FALLBACK;
    })();

  const evaluationMaxBodyHeight = useMemo(() => {
    if (!isLG || pageShellHeight <= 0 || evaluationReservedHeight === undefined) {
      return undefined;
    }

    return Math.max(120, pageShellHeight - liveDrawerHeight - evaluationReservedHeight);
  }, [evaluationReservedHeight, isLG, liveDrawerHeight, pageShellHeight]);

  useEffect(() => {
    if (!isReady || proxy === undefined || optimizationModel === undefined) {
      setEvaluationReport(undefined);
      setIsEvaluating(false);
      return;
    }

    const requestId = evaluationRequestIdRef.current + 1;
    evaluationRequestIdRef.current = requestId;
    const timeoutId = window.setTimeout(() => {
      let config;
      try {
        config = optimizationStore.getState().buildOptimizationConfig();
      } catch {
        if (evaluationRequestIdRef.current === requestId) {
          setEvaluationReport(undefined);
          setIsEvaluating(false);
        }
        return;
      }

      setIsEvaluating(true);
      void proxy.evaluateOptimizationProblem(optimizationModel, config)
        .then((report) => {
          if (evaluationRequestIdRef.current !== requestId) {
            return;
          }
          setEvaluationReport(report);
        })
        .catch(() => {
          if (evaluationRequestIdRef.current !== requestId) {
            return;
          }
          setEvaluationReport(undefined);
        })
        .finally(() => {
          if (evaluationRequestIdRef.current === requestId) {
            setIsEvaluating(false);
          }
        });
    }, 200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    isReady,
    proxy,
    optimizationModel,
    optimizationStore,
    optimizer,
    fieldWeights,
    wavelengthWeights,
    radiusModes,
    thicknessModes,
    operands,
  ]);

  const handleOptimize = async () => {
    if (proxy === undefined || optimizationModel === undefined) {
      return;
    }

    setOptimizationProgress([]);
    setOptimizationProgressModalOpen(true);
    setOptimizationRunComplete(false);
    optimizationStore.getState().setIsOptimizing(true);
    try {
      const config = optimizationStore.getState().buildOptimizationConfig();
      if (!hasNonZeroOptimizationContribution(config)) {
        optimizationStore.getState().openWarningModal(ZERO_WEIGHT_WARNING_MESSAGE);
        return;
      }
      const report = await proxy.optimizeOpm(
        optimizationModel,
        config,
        comlinkProxy((progress: ReadonlyArray<OptimizationProgressEntry>) => {
          setOptimizationProgress(progress);
        }),
      );
      setOptimizationProgress(report.optimization_progress ?? []);
      optimizationStore.getState().applyOptimizationResult(report);
      if (!report.success) {
        optimizationStore.getState().openWarningModal(report.message);
        return;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Optimization failed.";
      optimizationStore.getState().openWarningModal(message);
      onError();
    } finally {
      setOptimizationRunComplete(true);
      optimizationStore.getState().setIsOptimizing(false);
    }
  };

  const handleApplyToEditor = async () => {
    const model = optimizationStore.getState().optimizationModel;
    if (model === undefined) {
      return;
    }

    specsStore.getState().loadFromSpecs(model.specs);
    specsStore.getState().setCommittedSpecs(model.specs);
    lensStore.getState().setRows(surfacesToGridRows(model));
    lensStore.getState().setAutoAperture(model.setAutoAperture === "autoAperture");
    lensStore.getState().setCommittedOpticalModel(model);
    optimizationStore.getState().closeApplyConfirm();
    await onApplyToEditor?.(model);
  };

  const tabs: TabItem[] = [
    {
      id: "algorithm",
      label: "Algorithm",
      content: (
        <OptimizationAlgorithmTab
          optimizer={optimizer}
          onChangeOptimizer={(patch) => {
            optimizationStore.setState((state) => ({
              optimizer: { ...state.optimizer, ...patch },
            }));
          }}
        />
      ),
    },
    {
      id: "fields",
      label: "Fields",
      content: (
        <OptimizationWeightsGrid
          rows={fieldRows}
          onUpdateWeight={(index, value) => optimizationStore.getState().setFieldWeight(index, value)}
        />
      ),
    },
    {
      id: "wavelengths",
      label: "Wavelengths",
      content: (
        <OptimizationWeightsGrid
          rows={wavelengthRows}
          onUpdateWeight={(index, value) => optimizationStore.getState().setWavelengthWeight(index, value)}
        />
      ),
    },
    {
      id: "lens-prescription",
      label: "Lens Prescription",
      content: (
        <OptimizationLensPrescriptionGrid
          rows={radiusRows}
          radiusModes={radiusModes}
          thicknessModes={thicknessModes}
          onOpenRadiusModal={(surfaceIndex) => optimizationStore.getState().openRadiusModal(surfaceIndex)}
          onOpenThicknessModal={(surfaceIndex) => optimizationStore.getState().openThicknessModal(surfaceIndex)}
          onOpenMediumModal={setMediumModalRow}
          onOpenAsphericalModal={setAsphericalModalRow}
          onOpenDecenterModal={setDecenterModalRow}
          onOpenDiffractionGratingModal={setDiffractionGratingModalRow}
        />
      ),
    },
    {
      id: "operands",
      label: "Operands",
      content: (
        <OptimizationOperandsTab
          operands={operands}
          onAddOperand={() => optimizationStore.getState().addOperand()}
          onDeleteOperand={(id) => optimizationStore.getState().deleteOperand(id)}
          onUpdateOperand={(id, patch) => optimizationStore.getState().updateOperand(id, patch)}
        />
      ),
    },
  ];

  const sharedContent = (
    <div ref={sharedContentRef} data-testid="optimization-shared-content-wrapper" className="p-4 pb-0">
      <OptimizationProgressModal
        isOpen={optimizationProgressModalOpen}
        isOptimizing={isOptimizing}
        progress={optimizationProgress}
        onClose={() => {
          if (!optimizationRunComplete) {
            return;
          }
          setOptimizationProgressModalOpen(false);
        }}
      />

      <OptimizationActionBar
        canOptimize={canOptimize}
        canApplyToEditor={optimizationModel !== undefined}
        isOptimizing={isOptimizing}
        onOptimize={() => void handleOptimize()}
        onApplyToEditor={() => optimizationStore.getState().openApplyConfirm()}
      />

      <div ref={evaluationPanelRef}>
        <OptimizationEvaluationPanel
          rows={evaluationTableRows}
          isEvaluating={isEvaluating}
          maxBodyHeight={evaluationMaxBodyHeight}
          allowBodyScroll={isLG}
        />
      </div>

      <RadiusModeModal
        isOpen={radiusModal.open}
        optimizationModel={optimizationModel}
        surfaceIndex={radiusModal.surfaceIndex}
        selectedMode={selectedRadiusMode}
        onSetMode={(surfaceIndex, mode) => optimizationStore.getState().setRadiusMode(surfaceIndex, mode)}
        onClose={() => optimizationStore.getState().closeRadiusModal()}
      />

      <ThicknessModeModal
        isOpen={thicknessModal.open}
        optimizationModel={optimizationModel}
        surfaceIndex={thicknessModal.surfaceIndex}
        selectedMode={selectedThicknessMode}
        onSetMode={(surfaceIndex, mode) => optimizationStore.getState().setThicknessMode(surfaceIndex, mode)}
        onClose={() => optimizationStore.getState().closeThicknessModal()}
      />

      <OptimizationWarningModal
        isOpen={warningModal.open}
        message={warningModal.message}
        onClose={() => optimizationStore.getState().closeWarningModal()}
      />

      <OptimizationApplyConfirmModal
        isOpen={applyConfirmOpen}
        onCancel={() => optimizationStore.getState().closeApplyConfirm()}
        onConfirm={() => void handleApplyToEditor()}
      />

      <OptimizationInspectionModals
        mediumModalRow={mediumModalRow}
        asphericalModalRow={asphericalModalRow}
        decenterModalRow={decenterModalRow}
        diffractionGratingModalRow={diffractionGratingModalRow}
        onCloseMediumModal={() => setMediumModalRow(undefined)}
        onCloseAsphericalModal={() => setAsphericalModalRow(undefined)}
        onCloseDecenterModal={() => setDecenterModalRow(undefined)}
        onCloseDiffractionGratingModal={() => setDiffractionGratingModalRow(undefined)}
      />
    </div>
  );

  if (isLG) {
    return (
      <div ref={pageShellRef} className="relative flex flex-1 min-h-0 flex-col overflow-hidden">
        {sharedContent}
        <div data-testid="optimization-bottom-drawer-wrapper" className="mt-auto pb-4">
          <BottomDrawer
            tabs={tabs}
            draggable={true}
            panelClassName="p-0"
            activeTabId={activeTabId}
            onTabChange={(tabId) => optimizationStore.getState().setActiveTabId(tabId)}
            onHeightChange={setLiveDrawerHeight}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 min-h-0 flex-col overflow-y-auto">
      {sharedContent}
      <div data-testid="optimization-bottom-drawer-wrapper" className="pb-4">
        <BottomDrawer
          tabs={tabs}
          draggable={false}
          panelClassName="p-0"
          activeTabId={activeTabId}
          onTabChange={(tabId) => optimizationStore.getState().setActiveTabId(tabId)}
        />
      </div>
    </div>
  );
}
