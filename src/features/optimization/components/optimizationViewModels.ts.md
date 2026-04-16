# `features/optimization/components/optimizationViewModels.ts`

Shared optimization UI row types and formatting helpers used by the page and extracted view components.

## Behavior

- `createEvaluationRow(...)` returns a formatted row only when the residual `total_weight` is non-zero.
- Residuals with `total_weight === 0` are treated as hidden UI rows so the evaluation table omits terms disabled by zero operand, field, or wavelength weights.
