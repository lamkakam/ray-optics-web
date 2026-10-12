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
  OptimizationSystemOrSurfaceOperandKind,
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
 * Whether an operand kind evaluates the whole optical system, one optical
 * surface selected by a 1-based `surface_index` (object and image excluded), or
 * either: a `"system_or_surface"` kind evaluates the system when its config omits
 * `surface_index` and one surface when it supplies one.
 * Scope is orthogonal to `OptimizationOperandGoal`.
 */
export type OptimizationOperandScope =
  | "system"
  | "surface"
  | "system_or_surface";

/** Metadata shared by every operand kind regardless of its target mode. */
interface OptimizationOperandMetadataBase {
  readonly label: string;
  readonly defaultOptions?: OptimizationOperandOptions;
  readonly expandsByFieldAndWavelength: boolean;
  readonly getNominalResidualCountPerSample: (
    options?: OptimizationOperandOptions,
  ) => number;
}

/** Metadata for a system-only kind with a user-supplied target, including the GUI's default target text. */
export interface OptimizationAdjustableTargetOperandMetadata
  extends OptimizationOperandMetadataBase {
  readonly kind: Exclude<
    OptimizationAdjustableTargetOperandKind,
    OptimizationSystemOrSurfaceOperandKind
  >;
  readonly goal: "adjustable_target";
  readonly defaultTarget: string;
  readonly defaultRange?: undefined;
  readonly scope?: undefined;
  readonly requiresPositiveBounds?: undefined;
}

/** Metadata for a system-only kind whose implicit zero target is not user-configurable. */
export interface OptimizationFixedTargetOperandMetadata
  extends OptimizationOperandMetadataBase {
  readonly kind: Exclude<
    OptimizationFixedTargetOperandKind,
    OptimizationSystemOrSurfaceOperandKind
  >;
  readonly goal: "fixed_target";
  readonly defaultTarget?: undefined;
  readonly defaultRange?: undefined;
  readonly scope?: undefined;
  readonly requiresPositiveBounds?: undefined;
}

/** Metadata for a system-only range kind, including the GUI's default string-backed bounds. */
export interface OptimizationRangeOperandMetadata
  extends OptimizationOperandMetadataBase {
  readonly kind: Exclude<
    OptimizationRangeOperandKind,
    OptimizationSystemOrSurfaceOperandKind
  >;
  readonly goal: "range";
  readonly defaultTarget?: undefined;
  readonly defaultRange: OptimizationOperandRange<string>;
  readonly scope?: undefined;
  /** Whether both bounds must be strictly positive, as for Edge Thickness. */
  readonly requiresPositiveBounds?: boolean;
}

/** Metadata for a surface-only kind with a user-supplied target. */
export interface OptimizationSurfaceAdjustableTargetOperandMetadata
  extends OptimizationOperandMetadataBase {
  readonly kind: Exclude<
    OptimizationSurfaceAdjustableTargetOperandKind,
    OptimizationSystemOrSurfaceOperandKind
  >;
  readonly goal: "adjustable_target";
  readonly defaultTarget: string;
  readonly defaultRange?: undefined;
  readonly scope: "surface";
  readonly requiresPositiveBounds?: undefined;
}

/** Metadata for a surface-only kind whose implicit zero target is not user-configurable. */
export interface OptimizationSurfaceFixedTargetOperandMetadata
  extends OptimizationOperandMetadataBase {
  readonly kind: Exclude<
    OptimizationSurfaceFixedTargetOperandKind,
    OptimizationSystemOrSurfaceOperandKind
  >;
  readonly goal: "fixed_target";
  readonly defaultTarget?: undefined;
  readonly defaultRange?: undefined;
  readonly scope: "surface";
  readonly requiresPositiveBounds?: undefined;
}

/** Metadata for a surface-only range kind, including the GUI's default string-backed bounds. */
export interface OptimizationSurfaceRangeOperandMetadata
  extends OptimizationOperandMetadataBase {
  readonly kind: Exclude<
    OptimizationSurfaceRangeOperandKind,
    OptimizationSystemOrSurfaceOperandKind
  >;
  readonly goal: "range";
  readonly defaultTarget?: undefined;
  readonly defaultRange: OptimizationOperandRange<string>;
  readonly scope: "surface";
  /** Whether both bounds must be strictly positive, as for Edge Thickness. */
  readonly requiresPositiveBounds?: boolean;
}

/** Metadata for a system-or-surface kind with a user-supplied target, such as the third-order aberrations. */
export interface OptimizationSystemOrSurfaceAdjustableTargetOperandMetadata
  extends OptimizationOperandMetadataBase {
  readonly kind: Extract<
    OptimizationAdjustableTargetOperandKind,
    OptimizationSystemOrSurfaceOperandKind
  >;
  readonly goal: "adjustable_target";
  readonly defaultTarget: string;
  readonly defaultRange?: undefined;
  readonly scope: "system_or_surface";
  readonly requiresPositiveBounds?: undefined;
}

/** Metadata for a system-or-surface kind whose implicit zero target is not user-configurable; no kind uses it yet. */
export interface OptimizationSystemOrSurfaceFixedTargetOperandMetadata
  extends OptimizationOperandMetadataBase {
  readonly kind: Extract<
    OptimizationFixedTargetOperandKind,
    OptimizationSystemOrSurfaceOperandKind
  >;
  readonly goal: "fixed_target";
  readonly defaultTarget?: undefined;
  readonly defaultRange?: undefined;
  readonly scope: "system_or_surface";
  readonly requiresPositiveBounds?: undefined;
}

/** Metadata for a system-or-surface range kind, including the GUI's default string-backed bounds; no kind uses it yet. */
export interface OptimizationSystemOrSurfaceRangeOperandMetadata
  extends OptimizationOperandMetadataBase {
  readonly kind: Extract<
    OptimizationRangeOperandKind,
    OptimizationSystemOrSurfaceOperandKind
  >;
  readonly goal: "range";
  readonly defaultTarget?: undefined;
  readonly defaultRange: OptimizationOperandRange<string>;
  readonly scope: "system_or_surface";
  /** Whether both bounds must be strictly positive. */
  readonly requiresPositiveBounds?: boolean;
}

/**
 * Runtime metadata for one worker-supported operand kind, discriminated by its
 * target mode (`goal`) and scope: system-only kinds omit `scope`, surface-only
 * kinds set `scope: "surface"`, and kinds listed in both a system and a surface
 * group set `scope: "system_or_surface"`.
 */
export type OptimizationOperandMetadata =
  | OptimizationAdjustableTargetOperandMetadata
  | OptimizationFixedTargetOperandMetadata
  | OptimizationRangeOperandMetadata
  | OptimizationSurfaceAdjustableTargetOperandMetadata
  | OptimizationSurfaceFixedTargetOperandMetadata
  | OptimizationSurfaceRangeOperandMetadata
  | OptimizationSystemOrSurfaceAdjustableTargetOperandMetadata
  | OptimizationSystemOrSurfaceFixedTargetOperandMetadata
  | OptimizationSystemOrSurfaceRangeOperandMetadata;

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
