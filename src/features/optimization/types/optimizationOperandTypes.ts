/** Shared optimization operand metadata contracts. */
import type {
  OptimizationAdjustableTargetOperandKind,
  OptimizationFixedTargetOperandKind,
  OptimizationOperandKind,
  OptimizationOperandRange,
  OptimizationRangeOperandKind,
  OptimizationSurfaceAdjustableTargetOperandKind,
  OptimizationSurfaceFixedTargetOperandKind,
  OptimizationSurfaceRangeOperandKind,
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

/**
 * Whether an operand kind evaluates the whole optical system or one optical
 * surface selected by a 1-based `surface_index` (object and image excluded).
 * Scope is orthogonal to `OptimizationOperandGoal`.
 */
export type OptimizationOperandScope = "system" | "surface";

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
  readonly scope?: undefined;
}

/** Metadata for a kind whose implicit zero target is not user-configurable. */
export interface OptimizationFixedTargetOperandMetadata
  extends OptimizationOperandMetadataBase {
  readonly kind: OptimizationFixedTargetOperandKind;
  readonly goal: "fixed_target";
  readonly defaultTarget?: undefined;
  readonly defaultRange?: undefined;
  readonly scope?: undefined;
}

/** Metadata for a range kind, including the GUI's default string-backed bounds. */
export interface OptimizationRangeOperandMetadata
  extends OptimizationOperandMetadataBase {
  readonly kind: OptimizationRangeOperandKind;
  readonly goal: "range";
  readonly defaultTarget?: undefined;
  readonly defaultRange: OptimizationOperandRange<string>;
  readonly scope?: undefined;
}

/** Metadata for a surface-scoped kind with a user-supplied target. */
export interface OptimizationSurfaceAdjustableTargetOperandMetadata
  extends OptimizationOperandMetadataBase {
  readonly kind: OptimizationSurfaceAdjustableTargetOperandKind;
  readonly goal: "adjustable_target";
  readonly defaultTarget: string;
  readonly defaultRange?: undefined;
  readonly scope: "surface";
}

/** Metadata for a surface-scoped kind whose implicit zero target is not user-configurable. */
export interface OptimizationSurfaceFixedTargetOperandMetadata
  extends OptimizationOperandMetadataBase {
  readonly kind: OptimizationSurfaceFixedTargetOperandKind;
  readonly goal: "fixed_target";
  readonly defaultTarget?: undefined;
  readonly defaultRange?: undefined;
  readonly scope: "surface";
}

/** Metadata for a surface-scoped range kind, including the GUI's default string-backed bounds. */
export interface OptimizationSurfaceRangeOperandMetadata
  extends OptimizationOperandMetadataBase {
  readonly kind: OptimizationSurfaceRangeOperandKind;
  readonly goal: "range";
  readonly defaultTarget?: undefined;
  readonly defaultRange: OptimizationOperandRange<string>;
  readonly scope: "surface";
}

/**
 * Runtime metadata for one worker-supported operand kind, discriminated by its
 * target mode (`goal`) and, for surface-scoped kinds, `scope: "surface"`. System
 * kinds omit `scope`.
 */
export type OptimizationOperandMetadata =
  | OptimizationAdjustableTargetOperandMetadata
  | OptimizationFixedTargetOperandMetadata
  | OptimizationRangeOperandMetadata
  | OptimizationSurfaceAdjustableTargetOperandMetadata
  | OptimizationSurfaceFixedTargetOperandMetadata
  | OptimizationSurfaceRangeOperandMetadata;

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
