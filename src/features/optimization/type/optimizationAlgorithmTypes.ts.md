# `features/optimization/type/optimizationAlgorithmTypes.ts`

## Purpose

Optimization algorithm selection and capability types used by runtime capability helpers and their callers.

## Exports

- `OptimizationMethodCapabilities` — bound support and residual-dimension rule flags for one optimizer method or methodless optimizer kind
- `OptimizationAlgorithmSelection` — discriminated selection shape accepted by algorithm-capability lookup code

## Key Conventions

- `OptimizationAlgorithmSelection` preserves the least-squares method discriminator while allowing methodless optimizer kinds to be selected by `kind` only.
- Runtime capability lookup and config data stay in `features/optimization/lib/`.
