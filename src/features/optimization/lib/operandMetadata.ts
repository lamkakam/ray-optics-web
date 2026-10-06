/** Runtime metadata that keeps optimization operand selectors, evaluation labels, and validation aligned. */
import type {
  OptimizationAdjustableTargetOperandKind,
  OptimizationFixedTargetOperandKind,
  OptimizationOperandKind,
  OptimizationRangeOperandKind,
} from "@/features/optimization/types/optimizationWorkerTypes";
import type {
  OptimizationOperandMetadata,
  OptimizationOperandMetadataFor,
} from "@/features/optimization/types/optimizationOperandTypes";

/**
 * Per-kind production metadata. The `satisfies` clause makes the compiler require
 * an entry for every operand kind, including future range kinds, and a `goal`
 * (with `defaultTarget` or `defaultRange`) matching that kind's target-mode group.
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
} as const satisfies {
  readonly [TKind in OptimizationOperandKind]: OptimizationOperandMetadataFor<TKind>;
};

/** Operand metadata lookups and per-goal kind groups derived from one metadata list. */
export interface OptimizationOperandMetadataRegistry {
  /** Labels, target modes, defaults, field/wavelength expansion, and nominal residual counts for every operand, in selector order. */
  readonly OPTIMIZATION_OPERAND_METADATA: ReadonlyArray<OptimizationOperandMetadata>;
  /** Adjustable-target kinds in selector order, for schema enums. */
  readonly OPTIMIZATION_ADJUSTABLE_TARGET_OPERAND_KINDS: ReadonlyArray<OptimizationAdjustableTargetOperandKind>;
  /** Fixed-target kinds in selector order, for schema enums. */
  readonly OPTIMIZATION_FIXED_TARGET_OPERAND_KINDS: ReadonlyArray<OptimizationFixedTargetOperandKind>;
  /** Range kinds in selector order; empty until the first range operand is registered. */
  readonly OPTIMIZATION_RANGE_OPERAND_KINDS: ReadonlyArray<OptimizationRangeOperandKind>;
  /** Returns one kind's metadata, throwing for an unregistered kind. */
  readonly getOptimizationOperandMetadata: (
    kind: OptimizationOperandKind,
  ) => OptimizationOperandMetadata;
  /** Returns whether a kind is driven toward a user-supplied target. */
  readonly isOptimizationAdjustableTargetOperandKind: (
    kind: OptimizationOperandKind,
  ) => kind is OptimizationAdjustableTargetOperandKind;
  /** Returns whether a kind has an implicit, non-configurable zero target. */
  readonly isOptimizationFixedTargetOperandKind: (
    kind: OptimizationOperandKind,
  ) => kind is OptimizationFixedTargetOperandKind;
  /** Returns whether a kind is penalized only outside a `min`/`max` range. */
  readonly isOptimizationRangeOperandKind: (
    kind: OptimizationOperandKind,
  ) => kind is OptimizationRangeOperandKind;
}

/**
 * Builds the metadata registry for an ordered metadata list. The application uses
 * the production list below; tests may register additional kinds, such as a fake
 * range operand, before any production kind uses that target mode.
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
        metadata.goal === "adjustable_target" ? [metadata.kind] : [],
    ),
    OPTIMIZATION_FIXED_TARGET_OPERAND_KINDS: metadataList.flatMap((metadata) =>
      metadata.goal === "fixed_target" ? [metadata.kind] : [],
    ),
    OPTIMIZATION_RANGE_OPERAND_KINDS: metadataList.flatMap((metadata) =>
      metadata.goal === "range" ? [metadata.kind] : [],
    ),
    getOptimizationOperandMetadata,
    isOptimizationAdjustableTargetOperandKind: (
      kind,
    ): kind is OptimizationAdjustableTargetOperandKind =>
      getOptimizationOperandMetadata(kind).goal === "adjustable_target",
    isOptimizationFixedTargetOperandKind: (
      kind,
    ): kind is OptimizationFixedTargetOperandKind =>
      getOptimizationOperandMetadata(kind).goal === "fixed_target",
    isOptimizationRangeOperandKind: (
      kind,
    ): kind is OptimizationRangeOperandKind =>
      getOptimizationOperandMetadata(kind).goal === "range",
  };
}

/** Production operand metadata registry; see `OptimizationOperandMetadataRegistry` for each member. */
export const {
  OPTIMIZATION_OPERAND_METADATA,
  OPTIMIZATION_ADJUSTABLE_TARGET_OPERAND_KINDS,
  OPTIMIZATION_FIXED_TARGET_OPERAND_KINDS,
  OPTIMIZATION_RANGE_OPERAND_KINDS,
  getOptimizationOperandMetadata,
  isOptimizationAdjustableTargetOperandKind,
  isOptimizationFixedTargetOperandKind,
  isOptimizationRangeOperandKind,
} = createOptimizationOperandMetadataRegistry(
  Object.values(OPTIMIZATION_OPERAND_METADATA_BY_KIND_RECORD),
);
