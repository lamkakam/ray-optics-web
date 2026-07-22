/** Shared optimization operand metadata contracts. */
import type { OptimizationOperandKind } from "@/features/optimization/types/optimizationWorkerTypes";

/** Optional caller-owned settings for operands that need additional sampling configuration. */
export interface OptimizationOperandOptions {
  readonly num_rays?: number;
}

/** Runtime metadata for one worker-supported operand kind. */
export interface OptimizationOperandMetadata {
  readonly kind: OptimizationOperandKind;
  readonly label: string;
  readonly requiresTarget: boolean;
  readonly defaultTarget?: string;
  readonly defaultOptions?: OptimizationOperandOptions;
  readonly expandsByFieldAndWavelength: boolean;
  readonly getNominalResidualCountPerSample: (options?: OptimizationOperandOptions) => number;
}
