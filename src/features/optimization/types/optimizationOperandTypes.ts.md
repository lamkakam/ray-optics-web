# `features/optimization/types/optimizationOperandTypes.ts`

## Purpose

Optimization operand metadata and option types shared by operand metadata helpers and consumers.

## Exports

- `OptimizationOperandOptions` — optional per-operand settings, currently `num_rays` for ray-fan operands
- `OptimizationOperandMetadata` — metadata shape for one optimization operand kind

## Key Conventions

- `kind` is constrained to `OptimizationOperandKind` from `optimizationWorkerTypes.ts`.
- `defaultOptions` carries caller-owned default operand options when an operand needs them.
- `getNominalResidualCountPerSample(options)` is used for deterministic `lm` pre-validation.
- Runtime operand metadata and lookup helpers stay in `features/optimization/lib/operandMetadata.ts`.
