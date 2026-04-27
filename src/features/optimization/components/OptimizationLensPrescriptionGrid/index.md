# `features/optimization/components/OptimizationLensPrescriptionGrid/`

Components for the optimization lens prescription grid and its modal-backed variable/pickup editors.

The directory-level `index.ts` intentionally exports only `OptimizationLensPrescriptionGrid` and `OptimizationLensPrescriptionGridProps`. Helper components keep their own nested `index.ts` barrels so callers must opt into those narrower paths.

## Components

- [OptimizationLensPrescriptionGrid.tsx](./OptimizationLensPrescriptionGrid/OptimizationLensPrescriptionGrid.tsx.md) — read-only prescription grid with modal-backed inspection cells
- [index.ts](./index.ts.md) — narrow public import for the optimization lens prescription grid
- [OptimizationLensPrescriptionGrid/index.ts](./OptimizationLensPrescriptionGrid/index.ts.md) — component-level import for the optimization lens prescription grid
- [OptimizationInspectionModals.tsx](./OptimizationInspectionModals/OptimizationInspectionModals.tsx.md) — read-only lens-editor inspection modal wrappers
- [OptimizationInspectionModals/index.ts](./OptimizationInspectionModals/index.ts.md) — nested import for the inspection modal collection
- [ModeSelectField.tsx](./ModeSelectField/ModeSelectField.tsx.md) — shared constant/variable/pickup mode selector for optimization modals
- [ModeSelectField/index.ts](./ModeSelectField/index.ts.md) — nested import for the mode selector
- [BoundedVariableModeFields.tsx](../../lib/BoundedVariableModeFields/BoundedVariableModeFields.tsx.md) — shared Min/Max field group for optimization variable editors
- [UnboundedVariableModeFields.tsx](../../lib/UnboundedVariableModeFields/UnboundedVariableModeFields.tsx.md) — unbounded variable-mode body for methods without bounds
- [PickupModeFields.tsx](./PickupModeFields/PickupModeFields.tsx.md) — shared pickup field group for optimization modal editors
- [PickupModeFields/index.ts](./PickupModeFields/index.ts.md) — nested import for pickup field controls
