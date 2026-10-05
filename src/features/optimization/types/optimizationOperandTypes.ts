/** Shared optimization operand metadata contracts. */
import type {
  OptimizationOperandKind,
  OptimizationTargetlessOperandKind,
  OptimizationTargetOperandKind,
} from "@/features/optimization/types/optimizationWorkerTypes";

/** Optional caller-owned settings for operands that need additional sampling configuration. */
export interface OptimizationOperandOptions {
  readonly num_rays?: number;
}

/** Metadata shared by every operand kind regardless of its target mode. */
interface OptimizationOperandMetadataBase {
  readonly label: string;
  readonly defaultOptions?: OptimizationOperandOptions;
  readonly expandsByFieldAndWavelength: boolean;
  readonly getNominalResidualCountPerSample: (
    options?: OptimizationOperandOptions,
  ) => number;
}

/** Metadata for a kind that requires one target, with the GUI's default target text. */
export interface OptimizationTargetOperandMetadata
  extends OptimizationOperandMetadataBase {
  readonly kind: OptimizationTargetOperandKind;
  readonly goal: "target";
  readonly defaultTarget: string;
}

/** Metadata for a target-less kind. */
export interface OptimizationTargetlessOperandMetadata
  extends OptimizationOperandMetadataBase {
  readonly kind: OptimizationTargetlessOperandKind;
  readonly goal: "none";
  readonly defaultTarget?: undefined;
}

/**
 * Runtime metadata for one worker-supported operand kind, discriminated by its
 * target mode (`goal`). A range variant joins this union together with the
 * first `OptimizationRangeOperandKind` and its GUI support.
 */
export type OptimizationOperandMetadata =
  | OptimizationTargetOperandMetadata
  | OptimizationTargetlessOperandMetadata;

/** Metadata variant whose kind group contains `TKind`, narrowed to that exact kind. */
export type OptimizationOperandMetadataFor<
  TKind extends OptimizationOperandKind,
> = OptimizationOperandMetadata extends infer TMetadata
  ? TMetadata extends { readonly kind: infer TGroupKind }
    ? [TKind] extends [TGroupKind]
      ? TMetadata & { readonly kind: TKind }
      : never
    : never
  : never;
