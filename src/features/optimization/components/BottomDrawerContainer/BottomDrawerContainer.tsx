"use client";

import { memo, useCallback, useMemo, type ComponentProps } from "react";
import { useStore } from "zustand";
import { BottomDrawer, type TabItem } from "@/shared/components/layout/BottomDrawer";
import { useOptimizationStore } from "@/features/optimization/providers/OptimizationStoreProvider";
import { OptimizationAlgorithmTab } from "@/features/optimization/components/OptimizationAlgorithmTab";
import { OptimizationWeightsGrid } from "@/features/optimization/components/OptimizationWeightsGrid";
import {
  OptimizationLensPrescriptionGrid,
  type OptimizationLensPrescriptionGridProps,
} from "@/features/optimization/components/OptimizationLensPrescriptionGrid";
import { OptimizationOperandsTab } from "@/features/optimization/components/OptimizationOperandsTab";

type OptimizerPatch = Parameters<ComponentProps<typeof OptimizationAlgorithmTab>["onChangeOptimizer"]>[0];
type FieldsProps = Pick<ComponentProps<typeof OptimizationWeightsGrid>, "rows">;
type GridEditLifecycleProps = Pick<ComponentProps<typeof OptimizationWeightsGrid>, "onCellEditingStarted" | "onCellEditingStopped">;
type PrescriptionProps = Omit<
  OptimizationLensPrescriptionGridProps,
  | "radiusModes"
  | "thicknessModes"
  | "asphereStates"
  | "onOpenRadiusModal"
  | "onOpenThicknessModal"
  | "onOpenAsphereVarModal"
  | "onCellEditingStarted"
  | "onCellEditingStopped"
>;

export interface BottomDrawerContainerProps {
  readonly layout: {
    readonly isLG: boolean;
    readonly onHeightChange?: (height: number) => void;
  };
  readonly fields: Readonly<FieldsProps>;
  readonly wavelengths: Readonly<FieldsProps>;
  readonly prescription: Readonly<PrescriptionProps>;
  readonly gridEditLifecycle?: Readonly<GridEditLifecycleProps>;
  readonly onWarning: (message: string) => void;
}

export const BottomDrawerContainer = memo(function BottomDrawerContainer({
  layout,
  fields,
  wavelengths,
  prescription,
  gridEditLifecycle,
  onWarning,
}: BottomDrawerContainerProps) {
  const optimizationStore = useOptimizationStore();
  const activeTabId = useStore(optimizationStore, (state) => state.activeTabId);
  const optimizer = useStore(optimizationStore, (state) => state.optimizer);
  const radiusModes = useStore(optimizationStore, (state) => state.radiusModes);
  const thicknessModes = useStore(optimizationStore, (state) => state.thicknessModes);
  const asphereStates = useStore(optimizationStore, (state) => state.asphereStates);
  const operands = useStore(optimizationStore, (state) => state.operands);

  const handleChangeOptimizer = useCallback((patch: OptimizerPatch) => {
    if (patch.kind !== undefined && patch.kind !== optimizationStore.getState().optimizer.kind) {
      optimizationStore.getState().setOptimizerKind(patch.kind);
      return;
    }
    optimizationStore.setState((state) => ({
      optimizer: state.optimizer.kind === "least_squares"
        ? { ...state.optimizer, ...patch, kind: "least_squares" }
        : { ...state.optimizer, ...patch, kind: "differential_evolution" },
    }));
    if ("method" in patch && patch.method !== undefined) {
      try {
        optimizationStore.getState().buildOptimizationConfig();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Optimization config is invalid.";
        onWarning(message);
      }
    }
  }, [onWarning, optimizationStore]);

  const handleOpenRadiusModal = useCallback((surfaceIndex: number) => {
    optimizationStore.getState().openRadiusModal(surfaceIndex);
  }, [optimizationStore]);

  const handleOpenThicknessModal = useCallback((surfaceIndex: number) => {
    optimizationStore.getState().openThicknessModal(surfaceIndex);
  }, [optimizationStore]);

  const handleOpenAsphereModal = useCallback((surfaceIndex: number) => {
    optimizationStore.getState().openAsphereModal(surfaceIndex);
  }, [optimizationStore]);

  const handleUpdateFieldWeight = useCallback((index: number, value: number) => {
    optimizationStore.getState().setFieldWeight(index, value);
  }, [optimizationStore]);

  const handleUpdateWavelengthWeight = useCallback((index: number, value: number) => {
    optimizationStore.getState().setWavelengthWeight(index, value);
  }, [optimizationStore]);

  const handleAddOperand = useCallback(() => {
    optimizationStore.getState().addOperand();
  }, [optimizationStore]);

  const handleDeleteOperand = useCallback((id: string) => {
    optimizationStore.getState().deleteOperand(id);
  }, [optimizationStore]);

  const handleUpdateOperand = useCallback((id: string, patch: Partial<Omit<typeof operands[number], "id">>) => {
    optimizationStore.getState().updateOperand(id, patch);
  }, [optimizationStore]);

  const handleTabChange = useCallback((tabId: string) => {
    optimizationStore.getState().setActiveTabId(tabId);
  }, [optimizationStore]);

  const prescriptionProps = useMemo<OptimizationLensPrescriptionGridProps>(() => ({
    autoAperture: prescription.autoAperture,
    rows: prescription.rows,
    radiusModes,
    thicknessModes,
    asphereStates,
    onOpenRadiusModal: handleOpenRadiusModal,
    onOpenThicknessModal: handleOpenThicknessModal,
    onOpenMediumModal: prescription.onOpenMediumModal,
    onOpenAsphericalModal: prescription.onOpenAsphericalModal,
    onOpenApertureModal: prescription.onOpenApertureModal,
    onOpenAsphereVarModal: handleOpenAsphereModal,
    onOpenDecenterModal: prescription.onOpenDecenterModal,
    onOpenDiffractionGratingModal: prescription.onOpenDiffractionGratingModal,
    onCellEditingStarted: gridEditLifecycle?.onCellEditingStarted,
    onCellEditingStopped: gridEditLifecycle?.onCellEditingStopped,
  }), [
    asphereStates,
    gridEditLifecycle?.onCellEditingStarted,
    gridEditLifecycle?.onCellEditingStopped,
    handleOpenAsphereModal,
    handleOpenRadiusModal,
    handleOpenThicknessModal,
    prescription.onOpenApertureModal,
    prescription.onOpenAsphericalModal,
    prescription.onOpenDecenterModal,
    prescription.onOpenDiffractionGratingModal,
    prescription.onOpenMediumModal,
    prescription.autoAperture,
    prescription.rows,
    radiusModes,
    thicknessModes,
  ]);

  const tabs = useMemo<TabItem[]>(() => [
    {
      id: "algorithm",
      label: "Algorithm",
      content: (
        <OptimizationAlgorithmTab
          optimizer={optimizer}
          onChangeOptimizer={handleChangeOptimizer}
        />
      ),
    },
    {
      id: "fields",
      label: "Half-Fields",
      content: (
        <OptimizationWeightsGrid
          rows={fields.rows}
          valueColumnWidth={95}
          onUpdateWeight={handleUpdateFieldWeight}
          onCellEditingStarted={gridEditLifecycle?.onCellEditingStarted}
          onCellEditingStopped={gridEditLifecycle?.onCellEditingStopped}
        />
      ),
    },
    {
      id: "wavelengths",
      label: "Wavelengths",
      content: (
        <OptimizationWeightsGrid
          rows={wavelengths.rows}
          valueColumnWidth={130}
          onUpdateWeight={handleUpdateWavelengthWeight}
          onCellEditingStarted={gridEditLifecycle?.onCellEditingStarted}
          onCellEditingStopped={gridEditLifecycle?.onCellEditingStopped}
        />
      ),
    },
    {
      id: "lens-prescription",
      label: "Lens Prescription",
      content: (
        <OptimizationLensPrescriptionGrid {...prescriptionProps} />
      ),
    },
    {
      id: "operands",
      label: "Operands",
      content: (
        <OptimizationOperandsTab
          operands={operands}
          onAddOperand={handleAddOperand}
          onDeleteOperand={handleDeleteOperand}
          onUpdateOperand={handleUpdateOperand}
          onCellEditingStarted={gridEditLifecycle?.onCellEditingStarted}
          onCellEditingStopped={gridEditLifecycle?.onCellEditingStopped}
        />
      ),
    },
  ], [
    fields.rows,
    handleAddOperand,
    handleChangeOptimizer,
    handleDeleteOperand,
    handleUpdateFieldWeight,
    handleUpdateOperand,
    handleUpdateWavelengthWeight,
    gridEditLifecycle?.onCellEditingStarted,
    gridEditLifecycle?.onCellEditingStopped,
    operands,
    optimizer,
    prescriptionProps,
    wavelengths.rows,
  ]);

  return (
    <div
      data-testid="optimization-bottom-drawer-wrapper"
      className={layout.isLG ? "mt-auto pb-4" : "pb-4"}
    >
      <BottomDrawer
        tabs={tabs}
        draggable={layout.isLG}
        panelClassName="p-0"
        activeTabId={activeTabId}
        onTabChange={handleTabChange}
        onHeightChange={layout.onHeightChange}
      />
    </div>
  );
});

BottomDrawerContainer.displayName = "BottomDrawerContainer";
