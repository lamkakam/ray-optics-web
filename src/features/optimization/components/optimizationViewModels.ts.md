# `features/optimization/components/optimizationViewModels.ts`

Shared optimization UI row types and formatting helpers used by the page and extracted view components.

## Behavior

- `createEvaluationRow(...)` returns a formatted row only when the residual `total_weight` is non-zero.
- Imports optimization residual and operand kind types from `features/optimization/types/optimizationWorkerTypes.ts`.
- Operand labels are resolved through shared optimization operand metadata so selector labels and evaluation labels stay aligned.
- Evaluation-row `target` is rendered as `"N/A"` when a residual omits `target`, which is the display path used by target-less operands such as `ray_fan`.
- Evaluation-row `weight` and `value` are rendered as fixed 6-decimal strings for the operand evaluation table.
- Residuals with `total_weight === 0` are treated as hidden UI rows so the evaluation table omits terms disabled by zero operand, field, or wavelength weights.
