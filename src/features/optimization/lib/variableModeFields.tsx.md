# `features/optimization/lib/variableModeFields.tsx`

Selects the variable-mode editor renderer for optimization modals from one method-aware mapping.

## Behavior

- Exposes a single `VARIABLE_MODE_FIELDS_BY_OPTIMIZER` object keyed by `OptimizerKind` and `LeastSquaresMethod`.
- Maps least-squares `trf` to `BoundedVariableModeFields`.
- Maps least-squares `lm` to `UnboundedVariableModeFields`.
- Returns both the renderer component and a `usesBounds` flag so modal validation and helper copy stay aligned with the rendered UI.
