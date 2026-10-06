/** Shared optimization operand metadata contracts. */
import type {
  OptimizationAdjustableTargetOperandKind,
  OptimizationFixedTargetOperandKind,
  OptimizationOperandKind,
  OptimizationOperandRange,
  OptimizationRangeOperandKind,
} from "@/features/optimization/types/optimizationWorkerTypes";

/** Optional caller-owned settings for operands that need additional sampling configuration. */
export interface OptimizationOperandOptions {
  readonly num_rays?: number;
}

/** How an operand kind's values become residuals; shared by every kind in one group. */
export type OptimizationOperandGoal =
  | "adjustable_target"
  | "fixed_target"
  | "range";

/** Metadata shared by every operand kind regardless of its target mode. */
interface OptimizationOperandMetadataBase {
  readonly label: string;
  readonly defaultOptions?: OptimizationOperandOptions;
  readonly expandsByFieldAndWavelength: boolean;
  readonly getNominalResidualCountPerSample: (
    options?: OptimizationOperandOptions,
  ) => number;
}

/** Metadata for a kind with a user-supplied target, including the GUI's default target text. */
export interface OptimizationAdjustableTargetOperandMetadata
  extends OptimizationOperandMetadataBase {
  readonly kind: OptimizationAdjustableTargetOperandKind;
  readonly goal: "adjustable_target";
  readonly defaultTarget: string;
  readonly defaultRange?: undefined;
}

/** Metadata for a kind whose implicit zero target is not user-configurable. */
export interface OptimizationFixedTargetOperandMetadata
  extends OptimizationOperandMetadataBase {
  readonly kind: OptimizationFixedTargetOperandKind;
  readonly goal: "fixed_target";
  readonly defaultTarget?: undefined;
  readonly defaultRange?: undefined;
}

/** Metadata for a range kind, including the GUI's default string-backed bounds. */
export interface OptimizationRangeOperandMetadata
  extends OptimizationOperandMetadataBase {
  readonly kind: OptimizationRangeOperandKind;
  readonly goal: "range";
  readonly defaultTarget?: undefined;
  readonly defaultRange: OptimizationOperandRange<string>;
}

/** Runtime metadata for one worker-supported operand kind, discriminated by its target mode (`goal`). */
export type OptimizationOperandMetadata =
  | OptimizationAdjustableTargetOperandMetadata
  | OptimizationFixedTargetOperandMetadata
  | OptimizationRangeOperandMetadata;

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
