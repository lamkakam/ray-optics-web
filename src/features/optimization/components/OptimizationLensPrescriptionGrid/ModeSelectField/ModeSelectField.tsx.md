# `features/optimization/components/LensPrescriptionGrid/ModeSelectField/ModeSelectField.tsx`

Shared optimization-only mode selector for `constant`, `variable`, and `pickup`.

## Behavior

- Renders the shared optimization mode dropdown using `MODAL_MODE_OPTIONS` from `modalHelpers.ts`.
- Preserves caller-owned label text and aria-labels so consuming modals keep their existing copy and accessibility names.
- Does not own state; callers pass the current mode and receive the selected `ModalModeChoice` from `features/optimization/types/optimizationModalTypes.ts` through `onChange`.
