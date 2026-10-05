/** Runtime metadata that keeps optimization operand selectors, evaluation labels, and validation aligned. */
import type {
  OptimizationOperandKind,
  OptimizationTargetlessOperandKind,
  OptimizationTargetOperandKind,
} from "@/features/optimization/types/optimizationWorkerTypes";
import type {
  OptimizationOperandMetadata,
  OptimizationOperandMetadataFor,
} from "@/features/optimization/types/optimizationOperandTypes";

/**
 * Per-kind metadata. The `satisfies` clause makes the compiler require an entry
 * for every operand kind and a `goal` matching that kind's target-mode group.
 * Insertion order is the selector order.
 */
const OPTIMIZATION_OPERAND_METADATA_BY_KIND_RECORD = {
  focal_length: {
    kind: "focal_length",
    label: "Paraxial focal length",
    goal: "target",
    defaultTarget: "100",
    expandsByFieldAndWavelength: false,
    getNominalResidualCountPerSample: () => 1,
  },
  f_number: {
    kind: "f_number",
    label: "Paraxial f/#",
    goal: "target",
    defaultTarget: "10",
    expandsByFieldAndWavelength: false,
    getNominalResidualCountPerSample: () => 1,
  },
  opd_difference: {
    kind: "opd_difference",
    label: "OPD Difference",
    goal: "target",
    defaultTarget: "0",
    expandsByFieldAndWavelength: true,
    getNominalResidualCountPerSample: () => 1,
  },
  opd_difference_tangential: {
    kind: "opd_difference_tangential",
    label: "OPD Difference (Tangential)",
    goal: "target",
    defaultTarget: "0",
    expandsByFieldAndWavelength: true,
    getNominalResidualCountPerSample: () => 1,
  },
  opd_difference_sagittal: {
    kind: "opd_difference_sagittal",
    label: "OPD Difference (Sagittal)",
    goal: "target",
    defaultTarget: "0",
    expandsByFieldAndWavelength: true,
    getNominalResidualCountPerSample: () => 1,
  },
  rms_spot_size: {
    kind: "rms_spot_size",
    label: "RMS Spot Size",
    goal: "target",
    defaultTarget: "0",
    expandsByFieldAndWavelength: true,
    getNominalResidualCountPerSample: () => 1,
  },
  rms_wavefront_error: {
    kind: "rms_wavefront_error",
    label: "RMS wavefront error",
    goal: "target",
    defaultTarget: "0",
    expandsByFieldAndWavelength: true,
    getNominalResidualCountPerSample: () => 1,
  },
  ray_fan: {
    kind: "ray_fan",
    label: "Ray Fan",
    goal: "none",
    defaultOptions: { num_rays: 21 },
    expandsByFieldAndWavelength: true,
    getNominalResidualCountPerSample: (options) =>
      (options?.num_rays ?? 21) * 2,
  },
  ray_fan_tangential: {
    kind: "ray_fan_tangential",
    label: "Ray Fan (Tangential)",
    goal: "none",
    defaultOptions: { num_rays: 21 },
    expandsByFieldAndWavelength: true,
    getNominalResidualCountPerSample: (options) => options?.num_rays ?? 21,
  },
  ray_fan_sagittal: {
    kind: "ray_fan_sagittal",
    label: "Ray Fan (Sagittal)",
    goal: "none",
    defaultOptions: { num_rays: 21 },
    expandsByFieldAndWavelength: true,
    getNominalResidualCountPerSample: (options) => options?.num_rays ?? 21,
  },
} as const satisfies {
  readonly [TKind in OptimizationOperandKind]: OptimizationOperandMetadataFor<TKind>;
};

/** Defines labels, target modes, defaults, field/wavelength expansion, and nominal residual counts for every operand, in selector order. Combined Ray Fan contributes two axes per ray; axis-specific variants contribute one. */
export const OPTIMIZATION_OPERAND_METADATA: ReadonlyArray<OptimizationOperandMetadata> =
  Object.values(OPTIMIZATION_OPERAND_METADATA_BY_KIND_RECORD);

/** Target operand kinds in selector order, for schema enums. */
export const OPTIMIZATION_TARGET_OPERAND_KINDS: ReadonlyArray<OptimizationTargetOperandKind> =
  OPTIMIZATION_OPERAND_METADATA.flatMap((metadata) =>
    metadata.goal === "target" ? [metadata.kind] : [],
  );

/** Target-less operand kinds in selector order, for schema enums. */
export const OPTIMIZATION_TARGETLESS_OPERAND_KINDS: ReadonlyArray<OptimizationTargetlessOperandKind> =
  OPTIMIZATION_OPERAND_METADATA.flatMap((metadata) =>
    metadata.goal === "none" ? [metadata.kind] : [],
  );

const OPTIMIZATION_OPERAND_METADATA_BY_KIND = new Map(
  OPTIMIZATION_OPERAND_METADATA.map(
    (metadata) => [metadata.kind, metadata] as const,
  ),
);

/** Defines the shared optimization operand metadata consumed by the store and operand/evaluation UI. */
export function getOptimizationOperandMetadata(
  kind: OptimizationOperandKind,
): OptimizationOperandMetadata {
  const metadata = OPTIMIZATION_OPERAND_METADATA_BY_KIND.get(kind);
  if (metadata === undefined) {
    throw new Error(`Unknown optimization operand kind: ${kind}`);
  }
  return metadata;
}

/** Returns whether an operand kind requires one scalar target. */
export function isOptimizationTargetOperandKind(
  kind: OptimizationOperandKind,
): kind is OptimizationTargetOperandKind {
  return getOptimizationOperandMetadata(kind).goal === "target";
}

/** Returns whether an operand kind is target-less. */
export function isOptimizationTargetlessOperandKind(
  kind: OptimizationOperandKind,
): kind is OptimizationTargetlessOperandKind {
  return getOptimizationOperandMetadata(kind).goal === "none";
}
