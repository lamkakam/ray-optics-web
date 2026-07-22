/**
Optimization operand metadata and option types shared by operand metadata helpers and consumers.

## Key Conventions

- `kind` is constrained to `OptimizationOperandKind` from `optimizationWorkerTypes.ts`.
- `defaultOptions` carries caller-owned default operand options when an operand needs them.
- `getNominalResidualCountPerSample(options)` is used for deterministic `lm` pre-validation.
- Runtime operand metadata and lookup helpers stay in `features/optimization/lib/operandMetadata.ts`.*/
import type { OptimizationOperandKind } from "@/features/optimization/types/optimizationWorkerTypes";

export interface OptimizationOperandOptions {
  readonly num_rays?: number;
}

export interface OptimizationOperandMetadata {
  readonly kind: OptimizationOperandKind;
  readonly label: string;
  readonly requiresTarget: boolean;
  readonly defaultTarget?: string;
  readonly defaultOptions?: OptimizationOperandOptions;
  readonly expandsByFieldAndWavelength: boolean;
  readonly getNominalResidualCountPerSample: (options?: OptimizationOperandOptions) => number;
}
