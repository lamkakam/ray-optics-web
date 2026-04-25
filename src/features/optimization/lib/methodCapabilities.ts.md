# `features/optimization/lib/methodCapabilities.ts`

## Purpose

Provides the shared optimizer-capability lookup used by the optimization UI and store validation.

## Public Surface

```ts
getOptimizationMethodCapabilities(method: LeastSquaresMethod): {
  canUseBounds: boolean;
  requiresResidualCountAtLeastVariableCount: boolean;
}

getOptimizationAlgorithmCapabilities(selection): {
  canUseBounds: boolean;
  requiresResidualCountAtLeastVariableCount: boolean;
}
```

## Key Behaviors

- Derives both least-squares capability flags from `optimizerUiConfig.ts` so UI rendering and config validation do not drift.
- `trf` reports `canUseBounds: true` and does not enforce the Levenberg-Marquardt residual-dimension rule.
- `lm` reports `canUseBounds: false` and does enforce `residuals >= variables`.
- `differential_evolution` reports `canUseBounds: true` and does not enforce the least-squares residual-count dimension rule.
- Keeps `getOptimizationMethodCapabilities()` for least-squares method callers and `getOptimizationAlgorithmCapabilities()` for optimizer-kind-aware callers.
