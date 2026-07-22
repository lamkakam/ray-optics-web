/**
# `features/optimization/components/BottomDrawerContainer/BottomDrawerContainer.tsx`

## Key Conventions

- This component preserves drawer tab labels, test IDs, padding, and tab component behavior from the previous page-local drawer implementation.
- Props are grouped to keep the component interface below the project prop-count limit while making tab ownership explicit.
- `OptimizationPage` remains responsible for deriving row data and owning local inspection-modal row state; store-backed drawer actions live here.
- Grid-relevant callback identities should stay stable unless their actual data dependencies change, because the Jest AG Grid mock and real AG Grid both model editor loss when column definitions are recreated during active editing.
*/
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

/**
## Props

```ts
interface BottomDrawerContainerProps {
  layout: {
    isLG: boolean;
    onHeightChange?: (height: number) => void;
  };
  fields: Pick<ComponentProps<typeof OptimizationWeightsGrid>, "rows">;
  wavelengths: Pick<ComponentProps<typeof OptimizationWeightsGrid>, "rows">;
  gridEditLifecycle?: Pick<ComponentProps<typeof OptimizationWeightsGrid>, "onCellEditingStarted" | "onCellEditingStopped">;
  onWarning: (message: string) => void;
  prescription: Omit<
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
}
```

- `layout` controls responsive drawer behavior:
  - `isLG` switches between draggable large-screen rendering and non-draggable small-screen rendering.
  - `onHeightChange` receives live drawer height changes when provided.
- `fields.rows` provides derived field weight rows.
- `wavelengths.rows` provides derived wavelength weight rows.
- `gridEditLifecycle` optionally provides page-level AG Grid edit start/stop callbacks shared by all Optimization grids.
- `onWarning` receives explicit method-switch config-build failures so the page can surface them in Operand Evaluation.
- `prescription` provides the synchronized auto-aperture mode, derived prescription rows, and local inspection-modal callbacks, including aperture inspection. Optimization variable modal callbacks and mode state are read from the optimization store.
*/
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

/**
## Purpose

Container for the optimization page bottom drawer. It owns the five optimization drawer tabs, responsive drawer wrapper, and optimization-store-backed tab callbacks.

## Behavior

- Builds the drawer tabs in the fixed order `Algorithm`, `Half-Fields`, `Wavelengths`, `Lens Prescription`, and `Operands`.
- Keeps `data-testid="optimization-bottom-drawer-wrapper"` on the wrapper for existing page tests.
- Uses `mt-auto pb-4` on large screens and `pb-4` on smaller screens.
- Passes `panelClassName="p-0"` so tab contents keep their own gutter.
- Sets `draggable` from `layout.isLG`.
- Reads the optimization store for active tab state, optimizer state, radius/thickness/asphere modes, operands, and all store-backed drawer callbacks.
- Handles optimizer patch updates locally, including optimizer-kind resets through `setOptimizerKind()` and method-change config validation warnings through `onWarning`.
- Updates field and wavelength weights through the optimization store.
- Forwards shared AG Grid edit lifecycle callbacks into Half-Fields, Wavelengths, Lens Prescription, and Operands grids so `OptimizationPage` can disable Optimize while edits and post-edit evaluations are pending.
- Renders the shared weight grid with tab-specific `Value` column widths: `95px` for fields and `130px` for wavelengths.
- Opens radius, thickness, and asphere variable modals through the optimization store while forwarding inspection-modal callbacks supplied by `OptimizationPage`.
- Forwards `prescription.autoAperture` to `OptimizationLensPrescriptionGrid` so the shared semi-diameter column uses the synchronized mode.
- Adds, deletes, and updates operands through the optimization store.
- Is wrapped in `React.memo` and memoizes store-backed callbacks, prescription props, and the drawer `tabs` array so unrelated `OptimizationPage` state changes, including Operand Evaluation loading and completion, do not recreate AG Grid column definitions or reset active grid editors.
*/
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
