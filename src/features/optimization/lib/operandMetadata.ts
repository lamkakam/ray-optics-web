/** Runtime metadata that keeps optimization operand selectors, evaluation labels, and validation aligned. */
import type {
  OptimizationAdjustableTargetOperandKind,
  OptimizationFixedTargetOperandKind,
  OptimizationOperandKind,
  OptimizationRangeOperandKind,
  OptimizationSurfaceAdjustableTargetOperandKind,
  OptimizationSurfaceFixedTargetOperandKind,
  OptimizationSurfaceOperandKind,
  OptimizationSurfaceRangeOperandKind,
  OptimizationSystemOrSurfaceOperandKind,
} from "@/features/optimization/types/optimizationWorkerTypes";
import type {
  OptimizationOperandGoal,
  OptimizationOperandMetadata,
  OptimizationOperandMetadataFor,
} from "@/features/optimization/types/optimizationOperandTypes";

/**
 * Per-kind production metadata. The `satisfies` clause makes the compiler require
 * an entry for every operand kind, including future range and surface-scoped
 * kinds, and a `goal` (with `defaultTarget` or `defaultRange`) and `scope`
 * matching that kind's group. The third-order aberration kinds read paraxial
 * third-order wavefront coefficients (waves of the central wavelength) and are
 * `"system_or_surface"`: the system sum without a surface index, or one surface's
 * contribution with one.
 * Insertion order is the selector order.
 */
const OPTIMIZATION_OPERAND_METADATA_BY_KIND_RECORD = {
  focal_length: {
    kind: "focal_length",
    label: "Paraxial focal length",
    goal: "adjustable_target",
    defaultTarget: "100",
    expandsByFieldAndWavelength: false,
    getNominalResidualCountPerSample: () => 1,
  },
  f_number: {
    kind: "f_number",
    label: "Paraxial f/#",
    goal: "adjustable_target",
    defaultTarget: "10",
    expandsByFieldAndWavelength: false,
    getNominalResidualCountPerSample: () => 1,
  },
  third_order_spherical_aberration: {
    kind: "third_order_spherical_aberration",
    label: "3rd-Order Spherical Aberr. (W040)",
    goal: "adjustable_target",
    scope: "system_or_surface",
    defaultTarget: "0",
    expandsByFieldAndWavelength: false,
    getNominalResidualCountPerSample: () => 1,
  },
  third_order_coma: {
    kind: "third_order_coma",
    label: "3rd-Order Coma (W131)",
    goal: "adjustable_target",
    scope: "system_or_surface",
    defaultTarget: "0",
    expandsByFieldAndWavelength: false,
    getNominalResidualCountPerSample: () => 1,
  },
  third_order_astigmatism: {
    kind: "third_order_astigmatism",
    label: "3rd-Order Astigmatism (W222)",
    goal: "adjustable_target",
    scope: "system_or_surface",
    defaultTarget: "0",
    expandsByFieldAndWavelength: false,
    getNominalResidualCountPerSample: () => 1,
  },
  third_order_petzval_curvature: {
    kind: "third_order_petzval_curvature",
    label: "3rd-Order Petzval Curvature (W220P)",
    goal: "adjustable_target",
    scope: "system_or_surface",
    defaultTarget: "0",
    expandsByFieldAndWavelength: false,
    getNominalResidualCountPerSample: () => 1,
  },
  third_order_field_curvature: {
    kind: "third_order_field_curvature",
    label: "3rd-Order Field Curvature (W220)",
    goal: "adjustable_target",
    scope: "system_or_surface",
    defaultTarget: "0",
    expandsByFieldAndWavelength: false,
    getNominalResidualCountPerSample: () => 1,
  },
  third_order_distortion: {
    kind: "third_order_distortion",
    label: "3rd-Order Distortion (W311)",
    goal: "adjustable_target",
    scope: "system_or_surface",
    defaultTarget: "0",
    expandsByFieldAndWavelength: false,
    getNominalResidualCountPerSample: () => 1,
  },
  primary_axial_chromatic_aberration: {
    kind: "primary_axial_chromatic_aberration",
    label: "Primary Axial Chromatic Aberr. (W020)",
    goal: "adjustable_target",
    scope: "system_or_surface",
    defaultTarget: "0",
    expandsByFieldAndWavelength: false,
    getNominalResidualCountPerSample: () => 1,
  },
  primary_lateral_chromatic_aberration: {
    kind: "primary_lateral_chromatic_aberration",
    label: "Primary Lateral Chromatic Aberr. (W111)",
    goal: "adjustable_target",
    scope: "system_or_surface",
    defaultTarget: "0",
    expandsByFieldAndWavelength: false,
    getNominalResidualCountPerSample: () => 1,
  },
  opd_difference: {
    kind: "opd_difference",
    label: "OPD Difference",
    goal: "adjustable_target",
    defaultTarget: "0",
    expandsByFieldAndWavelength: true,
    getNominalResidualCountPerSample: () => 1,
  },
  opd_difference_tangential: {
    kind: "opd_difference_tangential",
    label: "OPD Difference (Tangential)",
    goal: "adjustable_target",
    defaultTarget: "0",
    expandsByFieldAndWavelength: true,
    getNominalResidualCountPerSample: () => 1,
  },
  opd_difference_sagittal: {
    kind: "opd_difference_sagittal",
    label: "OPD Difference (Sagittal)",
    goal: "adjustable_target",
    defaultTarget: "0",
    expandsByFieldAndWavelength: true,
    getNominalResidualCountPerSample: () => 1,
  },
  rms_spot_size: {
    kind: "rms_spot_size",
    label: "RMS Spot Size",
    goal: "adjustable_target",
    defaultTarget: "0",
    expandsByFieldAndWavelength: true,
    getNominalResidualCountPerSample: () => 1,
  },
  rms_wavefront_error: {
    kind: "rms_wavefront_error",
    label: "RMS wavefront error",
    goal: "adjustable_target",
    defaultTarget: "0",
    expandsByFieldAndWavelength: true,
    getNominalResidualCountPerSample: () => 1,
  },
  ray_fan: {
    kind: "ray_fan",
    label: "Ray Fan",
    goal: "fixed_target",
    defaultOptions: { num_rays: 21 },
    expandsByFieldAndWavelength: true,
    getNominalResidualCountPerSample: (options) =>
      (options?.num_rays ?? 21) * 2,
  },
  ray_fan_tangential: {
    kind: "ray_fan_tangential",
    label: "Ray Fan (Tangential)",
    goal: "fixed_target",
    defaultOptions: { num_rays: 21 },
    expandsByFieldAndWavelength: true,
    getNominalResidualCountPerSample: (options) => options?.num_rays ?? 21,
  },
  ray_fan_sagittal: {
    kind: "ray_fan_sagittal",
    label: "Ray Fan (Sagittal)",
    goal: "fixed_target",
    defaultOptions: { num_rays: 21 },
    expandsByFieldAndWavelength: true,
    getNominalResidualCountPerSample: (options) => options?.num_rays ?? 21,
  },
  edge_thickness: {
    kind: "edge_thickness",
    label: "Edge Thickness",
    goal: "range",
    scope: "surface",
    defaultRange: { min: "3" },
    requiresPositiveBounds: true,
    expandsByFieldAndWavelength: false,
    getNominalResidualCountPerSample: () => 1,
  },
} as const satisfies {
  readonly [TKind in OptimizationOperandKind]: OptimizationOperandMetadataFor<TKind>;
};

/**
 * Operand metadata lookups and per-goal, per-scope kind groups derived from one
 * metadata list. The unprefixed groups and guards cover kinds that accept the
 * system scope; the surface groups and guards cover kinds that accept a
 * `surface_index`. A `"system_or_surface"` kind is in both.
 */
export interface OptimizationOperandMetadataRegistry {
  /** Labels, target modes, scopes, defaults, field/wavelength expansion, and nominal residual counts for every operand, in selector order. */
  readonly OPTIMIZATION_OPERAND_METADATA: ReadonlyArray<OptimizationOperandMetadata>;
  /** Adjustable-target kinds accepting the system scope (including system-or-surface kinds) in selector order, for schema enums. */
  readonly OPTIMIZATION_ADJUSTABLE_TARGET_OPERAND_KINDS: ReadonlyArray<OptimizationAdjustableTargetOperandKind>;
  /** Fixed-target kinds accepting the system scope in selector order, for schema enums. */
  readonly OPTIMIZATION_FIXED_TARGET_OPERAND_KINDS: ReadonlyArray<OptimizationFixedTargetOperandKind>;
  /** Range kinds accepting the system scope in selector order; empty until the first range operand is registered. */
  readonly OPTIMIZATION_RANGE_OPERAND_KINDS: ReadonlyArray<OptimizationRangeOperandKind>;
  /** Adjustable-target kinds accepting a `surface_index` (the system-or-surface third-order kinds) in selector order. */
  readonly OPTIMIZATION_SURFACE_ADJUSTABLE_TARGET_OPERAND_KINDS: ReadonlyArray<OptimizationSurfaceAdjustableTargetOperandKind>;
  /** Fixed-target kinds accepting a `surface_index` in selector order; empty until the first one is registered. */
  readonly OPTIMIZATION_SURFACE_FIXED_TARGET_OPERAND_KINDS: ReadonlyArray<OptimizationSurfaceFixedTargetOperandKind>;
  /** Range kinds accepting a `surface_index` in selector order. */
  readonly OPTIMIZATION_SURFACE_RANGE_OPERAND_KINDS: ReadonlyArray<OptimizationSurfaceRangeOperandKind>;
  /** Returns one kind's metadata, throwing for an unregistered kind. */
  readonly getOptimizationOperandMetadata: (
    kind: OptimizationOperandKind,
  ) => OptimizationOperandMetadata;
  /** Returns whether a kind accepting the system scope is driven toward a user-supplied target. */
  readonly isOptimizationAdjustableTargetOperandKind: (
    kind: OptimizationOperandKind,
  ) => kind is OptimizationAdjustableTargetOperandKind;
  /** Returns whether a kind accepting the system scope has an implicit, non-configurable zero target. */
  readonly isOptimizationFixedTargetOperandKind: (
    kind: OptimizationOperandKind,
  ) => kind is OptimizationFixedTargetOperandKind;
  /** Returns whether a kind accepting the system scope is penalized only outside a `min`/`max` range. */
  readonly isOptimizationRangeOperandKind: (
    kind: OptimizationOperandKind,
  ) => kind is OptimizationRangeOperandKind;
  /** Returns whether a kind accepts a `surface_index` (surface-only or system-or-surface), regardless of its goal. */
  readonly isOptimizationSurfaceOperandKind: (
    kind: OptimizationOperandKind,
  ) => kind is OptimizationSurfaceOperandKind;
  /** Returns whether a kind accepting a `surface_index` is penalized only outside a `min`/`max` range at that surface. */
  readonly isOptimizationSurfaceRangeOperandKind: (
    kind: OptimizationOperandKind,
  ) => kind is OptimizationSurfaceRangeOperandKind;
  /** Returns whether a kind evaluates the system without a `surface_index` and one surface with it. */
  readonly isOptimizationSystemOrSurfaceOperandKind: (
    kind: OptimizationOperandKind,
  ) => kind is OptimizationSystemOrSurfaceOperandKind;
}

/** Metadata variants of one target mode that accept the system or the surface scope. */
type SystemMetadataWithGoal<TGoal extends OptimizationOperandGoal> = Exclude<
  Extract<OptimizationOperandMetadata, { readonly goal: TGoal }>,
  { readonly scope: "surface" }
>;
type SurfaceMetadataWithGoal<TGoal extends OptimizationOperandGoal> = Extract<
  OptimizationOperandMetadata,
  { readonly goal: TGoal; readonly scope: "surface" | "system_or_surface" }
>;

/** Returns whether metadata belongs to a kind evaluable for the whole system. */
function supportsSystemScope(metadata: OptimizationOperandMetadata): boolean {
  return metadata.scope !== "surface";
}

/** Returns whether metadata belongs to a kind evaluable at one `surface_index`. */
function supportsSurfaceScope(metadata: OptimizationOperandMetadata): boolean {
  return metadata.scope === "surface" || metadata.scope === "system_or_surface";
}

/** Returns whether metadata belongs to a system-scope-capable kind with the given target mode. */
function isSystemMetadataWithGoal<TGoal extends OptimizationOperandGoal>(
  metadata: OptimizationOperandMetadata,
  goal: TGoal,
): metadata is SystemMetadataWithGoal<TGoal> {
  return metadata.goal === goal && supportsSystemScope(metadata);
}

/** Returns whether metadata belongs to a surface-scope-capable kind with the given target mode. */
function isSurfaceMetadataWithGoal<TGoal extends OptimizationOperandGoal>(
  metadata: OptimizationOperandMetadata,
  goal: TGoal,
): metadata is SurfaceMetadataWithGoal<TGoal> {
  return metadata.goal === goal && supportsSurfaceScope(metadata);
}

/**
 * Builds the metadata registry for an ordered metadata list. The application uses
 * the production list below; tests may register additional kinds, such as a fake
 * range or surface-scoped operand, before any production kind uses that group.
 */
export function createOptimizationOperandMetadataRegistry(
  metadataList: ReadonlyArray<OptimizationOperandMetadata>,
): OptimizationOperandMetadataRegistry {
  const metadataByKind = new Map(
    metadataList.map((metadata) => [metadata.kind, metadata] as const),
  );
  const getOptimizationOperandMetadata = (
    kind: OptimizationOperandKind,
  ): OptimizationOperandMetadata => {
    const metadata = metadataByKind.get(kind);
    if (metadata === undefined) {
      throw new Error(`Unknown optimization operand kind: ${kind}`);
    }
    return metadata;
  };
  return {
    OPTIMIZATION_OPERAND_METADATA: metadataList,
    OPTIMIZATION_ADJUSTABLE_TARGET_OPERAND_KINDS: metadataList.flatMap(
      (metadata) =>
        isSystemMetadataWithGoal(metadata, "adjustable_target")
          ? [metadata.kind]
          : [],
    ),
    OPTIMIZATION_FIXED_TARGET_OPERAND_KINDS: metadataList.flatMap((metadata) =>
      isSystemMetadataWithGoal(metadata, "fixed_target") ? [metadata.kind] : [],
    ),
    OPTIMIZATION_RANGE_OPERAND_KINDS: metadataList.flatMap((metadata) =>
      isSystemMetadataWithGoal(metadata, "range") ? [metadata.kind] : [],
    ),
    OPTIMIZATION_SURFACE_ADJUSTABLE_TARGET_OPERAND_KINDS: metadataList.flatMap(
      (metadata) =>
        isSurfaceMetadataWithGoal(metadata, "adjustable_target")
          ? [metadata.kind]
          : [],
    ),
    OPTIMIZATION_SURFACE_FIXED_TARGET_OPERAND_KINDS: metadataList.flatMap(
      (metadata) =>
        isSurfaceMetadataWithGoal(metadata, "fixed_target")
          ? [metadata.kind]
          : [],
    ),
    OPTIMIZATION_SURFACE_RANGE_OPERAND_KINDS: metadataList.flatMap(
      (metadata) =>
        isSurfaceMetadataWithGoal(metadata, "range") ? [metadata.kind] : [],
    ),
    getOptimizationOperandMetadata,
    isOptimizationAdjustableTargetOperandKind: (
      kind,
    ): kind is OptimizationAdjustableTargetOperandKind =>
      isSystemMetadataWithGoal(
        getOptimizationOperandMetadata(kind),
        "adjustable_target",
      ),
    isOptimizationFixedTargetOperandKind: (
      kind,
    ): kind is OptimizationFixedTargetOperandKind =>
      isSystemMetadataWithGoal(
        getOptimizationOperandMetadata(kind),
        "fixed_target",
      ),
    isOptimizationRangeOperandKind: (
      kind,
    ): kind is OptimizationRangeOperandKind =>
      isSystemMetadataWithGoal(getOptimizationOperandMetadata(kind), "range"),
    isOptimizationSurfaceOperandKind: (
      kind,
    ): kind is OptimizationSurfaceOperandKind =>
      supportsSurfaceScope(getOptimizationOperandMetadata(kind)),
    isOptimizationSurfaceRangeOperandKind: (
      kind,
    ): kind is OptimizationSurfaceRangeOperandKind =>
      isSurfaceMetadataWithGoal(getOptimizationOperandMetadata(kind), "range"),
    isOptimizationSystemOrSurfaceOperandKind: (
      kind,
    ): kind is OptimizationSystemOrSurfaceOperandKind =>
      getOptimizationOperandMetadata(kind).scope === "system_or_surface",
  };
}

/** Production operand metadata registry; see `OptimizationOperandMetadataRegistry` for each member. */
export const {
  OPTIMIZATION_OPERAND_METADATA,
  OPTIMIZATION_ADJUSTABLE_TARGET_OPERAND_KINDS,
  OPTIMIZATION_FIXED_TARGET_OPERAND_KINDS,
  OPTIMIZATION_RANGE_OPERAND_KINDS,
  OPTIMIZATION_SURFACE_ADJUSTABLE_TARGET_OPERAND_KINDS,
  OPTIMIZATION_SURFACE_FIXED_TARGET_OPERAND_KINDS,
  OPTIMIZATION_SURFACE_RANGE_OPERAND_KINDS,
  getOptimizationOperandMetadata,
  isOptimizationAdjustableTargetOperandKind,
  isOptimizationFixedTargetOperandKind,
  isOptimizationRangeOperandKind,
  isOptimizationSurfaceOperandKind,
  isOptimizationSurfaceRangeOperandKind,
  isOptimizationSystemOrSurfaceOperandKind,
} = createOptimizationOperandMetadataRegistry(
  Object.values(OPTIMIZATION_OPERAND_METADATA_BY_KIND_RECORD),
);
