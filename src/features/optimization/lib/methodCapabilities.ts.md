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

- Derives both least-squares capability flags from `optimizerUiConfig.ts` so UI rendering and config validation do not drift.
- `trf` reports `canUseBounds: true` and does not enforce the Levenberg-Marquardt residual-dimension rule.
- `lm` reports `canUseBounds: false` and does enforce `residuals >= variables`.
- Keeps `getOptimizationMethodCapabilities()` as a thin lookup API over the shared UI metadata.
