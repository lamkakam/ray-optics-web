import type { OptimizationOperandKind } from "@/features/optimization/type/optimizationWorkerTypes";
import type { OptimizationOperandMetadata } from "@/features/optimization/type/optimizationOperandTypes";

export const OPTIMIZATION_OPERAND_METADATA: ReadonlyArray<OptimizationOperandMetadata> = [
  {
    kind: "focal_length",
    label: "Paraxial focal length",
    requiresTarget: true,
    defaultTarget: "100",
    expandsByFieldAndWavelength: false,
    getNominalResidualCountPerSample: () => 1,
  },
  {
    kind: "f_number",
    label: "Paraxial f/#",
    requiresTarget: true,
    defaultTarget: "10",
    expandsByFieldAndWavelength: false,
    getNominalResidualCountPerSample: () => 1,
  },
  {
    kind: "opd_difference",
    label: "OPD Difference",
    requiresTarget: true,
    defaultTarget: "0",
    expandsByFieldAndWavelength: true,
    getNominalResidualCountPerSample: () => 1,
  },
  {
    kind: "rms_spot_size",
    label: "RMS Spot Size",
    requiresTarget: true,
    defaultTarget: "0",
    expandsByFieldAndWavelength: true,
    getNominalResidualCountPerSample: () => 1,
  },
  {
    kind: "rms_wavefront_error",
    label: "RMS wavefront error",
    requiresTarget: true,
    defaultTarget: "0",
    expandsByFieldAndWavelength: true,
    getNominalResidualCountPerSample: () => 1,
  },
  {
    kind: "ray_fan",
    label: "Ray Fan",
    requiresTarget: false,
    defaultOptions: { num_rays: 21 },
    expandsByFieldAndWavelength: true,
    getNominalResidualCountPerSample: (options) => (options?.num_rays ?? 21) * 2,
  },
] as const;

const OPTIMIZATION_OPERAND_METADATA_BY_KIND = new Map(
  OPTIMIZATION_OPERAND_METADATA.map((metadata) => [metadata.kind, metadata] as const),
);

export function getOptimizationOperandMetadata(kind: OptimizationOperandKind): OptimizationOperandMetadata {
  const metadata = OPTIMIZATION_OPERAND_METADATA_BY_KIND.get(kind);
  if (metadata === undefined) {
    throw new Error(`Unknown optimization operand kind: ${kind}`);
  }
  return metadata;
}
