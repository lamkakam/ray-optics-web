# `features/optimization/lib/methodCapabilities.ts`

## Purpose

Provides the shared method-capability lookup used by the optimization UI and store validation.

## Public Surface

```ts
getOptimizationMethodCapabilities(method: LeastSquaresMethod): {
  canUseBounds: boolean;
  requiresResidualCountAtLeastVariableCount: boolean;
}
```

## Key Behaviors

- Derives least-squares method bound support from `optimizerUiConfig.ts` so UI rendering and config validation do not drift.
- `trf` reports `canUseBounds: true` and does not enforce the Levenberg-Marquardt residual-dimension rule.
- `lm` reports `canUseBounds: false` and does enforce `residuals >= variables`.
- Keeps `requiresResidualCountAtLeastVariableCount` as an explicit behavior layer above the shared UI metadata, with only `lm` enabling it.
