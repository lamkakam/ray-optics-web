# `features/optimization/components/`

Components for the optimization workflow UI.

Direct component directories expose an `index.ts` barrel so page-level imports can target the component directory. The `LensPrescriptionGrid` directory also exposes a narrow barrel for the grid component only.

## Components

- [OptimizationActionBar.tsx](./OptimizationActionBar/OptimizationActionBar.tsx.md) — primary page actions for optimization and apply-to-editor
- [OptimizationActionBar/index.ts](./OptimizationActionBar/index.ts.md) — public directory import for the action bar
- [OptimizationEvaluationPanel.tsx](./OptimizationEvaluationPanel/OptimizationEvaluationPanel.tsx.md) — static residual table and empty/loading states
- [OptimizationEvaluationPanel/index.ts](./OptimizationEvaluationPanel/index.ts.md) — public directory import for the evaluation panel
- [OptimizationAlgorithmTab.tsx](./OptimizationAlgorithmTab/OptimizationAlgorithmTab.tsx.md) — optimizer parameter form
- [OptimizationAlgorithmTab/index.ts](./OptimizationAlgorithmTab/index.ts.md) — public directory import for the algorithm tab
- [LensPrescriptionGrid](./LensPrescriptionGrid/index.md) — lens prescription grid and its variable/pickup modal components
- [ModeSelectField.tsx](./LensPrescriptionGrid/ModeSelectField/ModeSelectField.tsx.md) — shared constant/variable/pickup mode selector for optimization modals
- [BoundedVariableModeFields.tsx](../lib/BoundedVariableModeFields/BoundedVariableModeFields.tsx.md) — shared Min/Max field group for optimization variable editors
- [UnboundedVariableModeFields.tsx](../lib/UnboundedVariableModeFields/UnboundedVariableModeFields.tsx.md) — unbounded variable-mode body for methods without bounds
- [PickupModeFields.tsx](./LensPrescriptionGrid/PickupModeFields/PickupModeFields.tsx.md) — shared pickup field group for optimization modal editors
- [OptimizationWeightsGrid.tsx](./OptimizationWeightsGrid/OptimizationWeightsGrid.tsx.md) — shared AG Grid view for field and wavelength weights
- [OptimizationWeightsGrid/index.ts](./OptimizationWeightsGrid/index.ts.md) — public directory import for the weights grid
- [OptimizationLensPrescriptionGrid.tsx](./LensPrescriptionGrid/OptimizationLensPrescriptionGrid/OptimizationLensPrescriptionGrid.tsx.md) — read-only prescription grid with modal-backed inspection cells
- [OptimizationOperandsTab.tsx](./OptimizationOperandsTab/OptimizationOperandsTab.tsx.md) — editable operand grid and add/delete actions
- [OptimizationOperandsTab/index.ts](./OptimizationOperandsTab/index.ts.md) — public directory import for the operands tab
- [OptimizationWarningModal.tsx](./OptimizationWarningModal/OptimizationWarningModal.tsx.md) — warning dialog wrapper
- [OptimizationWarningModal/index.ts](./OptimizationWarningModal/index.ts.md) — public directory import for the warning dialog
- [OptimizationApplyConfirmModal.tsx](./OptimizationApplyConfirmModal/OptimizationApplyConfirmModal.tsx.md) — apply confirmation dialog wrapper
- [OptimizationApplyConfirmModal/index.ts](./OptimizationApplyConfirmModal/index.ts.md) — public directory import for the apply confirmation dialog
- [OptimizationProgressModal.tsx](./OptimizationProgressModal/OptimizationProgressModal.tsx.md) — blocking optimization-progress dialog with live merit chart
- [OptimizationProgressModal/index.ts](./OptimizationProgressModal/index.ts.md) — public directory import for the progress dialog
- [OptimizationInspectionModals.tsx](./LensPrescriptionGrid/OptimizationInspectionModals/OptimizationInspectionModals.tsx.md) — read-only lens-editor inspection modal wrappers
- [RadiusModeModal.tsx](./RadiusModeModal/RadiusModeModal.tsx.md) — radius variable/pickup modal body
- [RadiusModeModal/index.ts](./RadiusModeModal/index.ts.md) — public directory import for the radius modal
- [ThicknessModeModal.tsx](./ThicknessModeModal/ThicknessModeModal.tsx.md) — thickness variable/pickup modal body
- [ThicknessModeModal/index.ts](./ThicknessModeModal/index.ts.md) — public directory import for the thickness modal
- [AsphereVarModal.tsx](./AsphereVarModal/AsphereVarModal.tsx.md) — asphere variable/pickup modal body
- [AsphereVarModal/index.ts](./AsphereVarModal/index.ts.md) — public directory import for the asphere modal
