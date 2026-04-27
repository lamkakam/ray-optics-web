# `features/optimization/components/`

Components for the optimization workflow UI.

## Components

- [OptimizationActionBar.tsx](./OptimizationActionBar.tsx.md) — primary page actions for optimization and apply-to-editor
- [OptimizationEvaluationPanel.tsx](./OptimizationEvaluationPanel.tsx.md) — static residual table and empty/loading states
- [OptimizationAlgorithmTab.tsx](./OptimizationAlgorithmTab.tsx.md) — optimizer parameter form
- [LensPrescriptionGrid](./LensPrescriptionGrid/index.md) — lens prescription grid and its variable/pickup modal components
- [ModeSelectField.tsx](./LensPrescriptionGrid/ModeSelectField/ModeSelectField.tsx.md) — shared constant/variable/pickup mode selector for optimization modals
- [BoundedVariableModeFields.tsx](../lib/BoundedVariableModeFields/BoundedVariableModeFields.tsx.md) — shared Min/Max field group for optimization variable editors
- [UnboundedVariableModeFields.tsx](../lib/UnboundedVariableModeFields/UnboundedVariableModeFields.tsx.md) — unbounded variable-mode body for methods without bounds
- [PickupModeFields.tsx](./LensPrescriptionGrid/PickupModeFields/PickupModeFields.tsx.md) — shared pickup field group for optimization modal editors
- [OptimizationWeightsGrid.tsx](./OptimizationWeightsGrid.tsx.md) — shared AG Grid view for field and wavelength weights
- [OptimizationLensPrescriptionGrid.tsx](./LensPrescriptionGrid/OptimizationLensPrescriptionGrid/OptimizationLensPrescriptionGrid.tsx.md) — read-only prescription grid with modal-backed inspection cells
- [OptimizationOperandsTab.tsx](./OptimizationOperandsTab.tsx.md) — editable operand grid and add/delete actions
- [RadiusModeModal.tsx](./LensPrescriptionGrid/RadiusModeModal/RadiusModeModal.tsx.md) — radius variable/pickup modal body
- [ThicknessModeModal.tsx](./LensPrescriptionGrid/ThicknessModeModal/ThicknessModeModal.tsx.md) — thickness variable/pickup modal body
- [AsphereVarModal.tsx](./LensPrescriptionGrid/AsphereVarModal/AsphereVarModal.tsx.md) — asphere variable/pickup modal body
- [OptimizationWarningModal.tsx](./OptimizationWarningModal.tsx.md) — warning dialog wrapper
- [OptimizationApplyConfirmModal.tsx](./OptimizationApplyConfirmModal.tsx.md) — apply confirmation dialog wrapper
- [OptimizationProgressModal.tsx](./OptimizationProgressModal.tsx.md) — blocking optimization-progress dialog with live merit chart
- [OptimizationInspectionModals.tsx](./LensPrescriptionGrid/OptimizationInspectionModals/OptimizationInspectionModals.tsx.md) — read-only lens-editor inspection modal wrappers
- [optimizationViewModels.ts](./optimizationViewModels.ts.md) — shared row/view helpers for optimization components
