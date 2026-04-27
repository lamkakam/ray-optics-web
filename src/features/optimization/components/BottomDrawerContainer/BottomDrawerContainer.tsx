"use client";

import type { ComponentProps } from "react";
import { useStore } from "zustand";
import { BottomDrawer, type TabItem } from "@/shared/components/layout/BottomDrawer";
import { useOptimizationStore } from "@/features/optimization/providers/OptimizationStoreProvider";
import { OptimizationAlgorithmTab } from "@/features/optimization/components/OptimizationAlgorithmTab";
import { OptimizationWeightsGrid } from "@/features/optimization/components/OptimizationWeightsGrid";
import {
  OptimizationLensPrescriptionGrid,
  type OptimizationLensPrescriptionGridProps,
} from "@/features/optimization/components/LensPrescriptionGrid";
import { OptimizationOperandsTab } from "@/features/optimization/components/OptimizationOperandsTab";

type OptimizerPatch = Parameters<ComponentProps<typeof OptimizationAlgorithmTab>["onChangeOptimizer"]>[0];
type FieldsProps = Pick<ComponentProps<typeof OptimizationWeightsGrid>, "rows">;
type PrescriptionProps = Omit<
  OptimizationLensPrescriptionGridProps,
  | "radiusModes"
  | "thicknessModes"
  | "asphereStates"
  | "onOpenRadiusModal"
  | "onOpenThicknessModal"
  | "onOpenAsphereVarModal"
>;

export interface BottomDrawerContainerProps {
  readonly layout: {
    readonly isLG: boolean;
    readonly onHeightChange?: (height: number) => void;
  };
  readonly fields: Readonly<FieldsProps>;
  readonly wavelengths: Readonly<FieldsProps>;
  readonly prescription: Readonly<PrescriptionProps>;
}

export function BottomDrawerContainer({
  layout,
  fields,
  wavelengths,
  prescription,
}: BottomDrawerContainerProps) {
  const optimizationStore = useOptimizationStore();
  const activeTabId = useStore(optimizationStore, (state) => state.activeTabId);
  const optimizer = useStore(optimizationStore, (state) => state.optimizer);
  const radiusModes = useStore(optimizationStore, (state) => state.radiusModes);
  const thicknessModes = useStore(optimizationStore, (state) => state.thicknessModes);
  const asphereStates = useStore(optimizationStore, (state) => state.asphereStates);
  const operands = useStore(optimizationStore, (state) => state.operands);

  const handleChangeOptimizer = (patch: OptimizerPatch) => {
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
        optimizationStore.getState().openWarningModal(message);
      }
    }
  };

  const prescriptionProps: OptimizationLensPrescriptionGridProps = {
    rows: prescription.rows,
    radiusModes,
    thicknessModes,
    asphereStates,
    onOpenRadiusModal: (surfaceIndex: number) => optimizationStore.getState().openRadiusModal(surfaceIndex),
    onOpenThicknessModal: (surfaceIndex: number) => optimizationStore.getState().openThicknessModal(surfaceIndex),
    onOpenMediumModal: prescription.onOpenMediumModal,
    onOpenAsphericalModal: prescription.onOpenAsphericalModal,
    onOpenAsphereVarModal: (surfaceIndex: number) => optimizationStore.getState().openAsphereModal(surfaceIndex),
    onOpenDecenterModal: prescription.onOpenDecenterModal,
    onOpenDiffractionGratingModal: prescription.onOpenDiffractionGratingModal,
  };

  const tabs: TabItem[] = [
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
      label: "Fields",
      content: (
        <OptimizationWeightsGrid
          rows={fields.rows}
          onUpdateWeight={(index, value) => optimizationStore.getState().setFieldWeight(index, value)}
        />
      ),
    },
    {
      id: "wavelengths",
      label: "Wavelengths",
      content: (
        <OptimizationWeightsGrid
          rows={wavelengths.rows}
          onUpdateWeight={(index, value) => optimizationStore.getState().setWavelengthWeight(index, value)}
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
          onAddOperand={() => optimizationStore.getState().addOperand()}
          onDeleteOperand={(id) => optimizationStore.getState().deleteOperand(id)}
          onUpdateOperand={(id, patch) => optimizationStore.getState().updateOperand(id, patch)}
        />
      ),
    },
  ];

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
        onTabChange={(tabId) => optimizationStore.getState().setActiveTabId(tabId)}
        onHeightChange={layout.onHeightChange}
      />
    </div>
  );
}
