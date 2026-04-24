# `features/optimization/lib/optimizerUiConfig.ts`

## Purpose

Centralizes optimizer UI metadata so the optimization algorithm tab, store defaults, and method capability lookup all read the same labels, defaults, and per-method capability flags.

## Exports

- `OptimizerMethodUiConfig<TKind>` — one method option for an optimizer kind
- `OptimizerToleranceUiConfig<TKind>` — one tolerance field definition for an optimizer kind
- `OptimizerUiMetadata<TKind>` — grouped UI metadata for one optimizer kind
- `OptimizerUiConfig` — mapped type keyed by shared `OptimizerKind`
- `OPTIMIZER_UI_CONFIG` — current UI metadata record, keyed by optimizer kind
- `formatOptimizerUiDefaultValue(value)` — converts numeric defaults such as `1e-5` into the string format used by the form state

## Key Behaviors

- Derives method and tolerance key types from `shared/lib/types/optimization.ts` instead of restating unions locally.
- Constrains `methods[*].kind` to the valid method union for each optimizer kind.
- Constrains `tolerances[*].kind` to numeric optimizer fields other than `kind`, `method`, and `max_nfev`.
- Stores the least-squares method labels, `canUseBounds` flags, `requiresResidualCountAtLeastVariableCount` flags, and tolerance labels/defaults in one UI-facing config object.
