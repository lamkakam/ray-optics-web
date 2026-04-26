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
