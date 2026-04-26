# `features/optimization/lib/variableModeFields.tsx`

Selects the variable-mode editor renderer for optimization modals from one method-aware mapping.

Type definitions for renderer props and return shape live in `features/optimization/types/optimizationVariableFieldTypes.ts`.

## Behavior

- Exposes `getVariableModeFieldsRenderer(canUseBounds)` so modal rendering depends only on a caller-supplied boolean instead of optimizer-kind/method types.
- Returns `BoundedVariableModeFields` when `canUseBounds === true`.
- Returns `UnboundedVariableModeFields` when `canUseBounds === false`.
