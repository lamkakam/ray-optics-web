# `features/optimization/lib/optimizerUiConfig.ts`

## Purpose

Centralizes optimizer UI metadata so the optimization algorithm tab, store defaults, and method capability lookup all read the same labels, defaults, and per-method capability flags.

## Exports

- `OptimizerMethodUiConfig<TKind>` — one method option for an optimizer kind
- `OptimizerToleranceUiConfig<TKind>` — one tolerance field definition for an optimizer kind
- `OptimizerUiMetadataWithMethods<TKind>` — grouped UI metadata for a method-based optimizer kind
- `OptimizerUiMetadataWithoutMethods<TKind>` — grouped UI metadata for a methodless optimizer kind
- `OptimizerUiMetadata<TKind>` — union of the two valid metadata shapes for one optimizer kind
- `OptimizerUiConfig` — mapped type keyed by shared `OptimizerKind`
- `OPTIMIZER_UI_CONFIG` — current UI metadata record, keyed by optimizer kind
- `optimizerUiMetadataHasMethods(metadata)` — narrows metadata to the method-based shape before reading `methods`
- `formatOptimizerUiDefaultValue(value)` — converts numeric defaults such as `1e-5` into the string format used by the form state

## Key Behaviors

- Derives method and tolerance key types from `shared/lib/types/optimization.ts` instead of restating unions locally.
- Constrains `methods[*].kind` to the valid method union for each optimizer kind when that optimizer exposes methods.
- Constrains `tolerances[*].kind` to numeric optimizer fields other than `kind`, `method`, and `max_nfev`.
- Supports two metadata shapes:
  method-based optimizers expose `methods[*].canUseBounds` and `methods[*].requiresResidualCountAtLeastVariableCount`
  methodless optimizers omit `methods` and instead expose top-level `canUseBounds` and `requiresResidualCountAtLeastVariableCount`
- Requires `least_squares` to remain method-based inside `OptimizerUiConfig`, while allowing other optimizer kinds to use either metadata shape in the future.
- Stores the least-squares method labels, capability flags, and tolerance labels/defaults in one UI-facing config object.
