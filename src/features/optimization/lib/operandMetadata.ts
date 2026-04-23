import type { OptimizationOperandKind } from "@/shared/lib/types/optimization";

export interface OptimizationOperandMetadata {
  readonly kind: OptimizationOperandKind;
  readonly label: string;
  readonly requiresTarget: boolean;
  readonly defaultTarget?: string;
  readonly expandsByFieldAndWavelength: boolean;
  readonly nominalResidualCountPerSample: number;
}

const RAY_FAN_SAMPLES_PER_AXIS = 21;

export const OPTIMIZATION_OPERAND_METADATA: ReadonlyArray<OptimizationOperandMetadata> = [
  {
    kind: "focal_length",
    label: "Paraxial focal length",
    requiresTarget: true,
    defaultTarget: "100",
    expandsByFieldAndWavelength: false,
    nominalResidualCountPerSample: 1,
  },
  {
    kind: "f_number",
    label: "Paraxial f/#",
    requiresTarget: true,
    defaultTarget: "10",
    expandsByFieldAndWavelength: false,
    nominalResidualCountPerSample: 1,
  },
  {
    kind: "opd_difference",
    label: "OPD Difference",
    requiresTarget: true,
    defaultTarget: "0",
    expandsByFieldAndWavelength: true,
    nominalResidualCountPerSample: 1,
  },
  {
    kind: "rms_spot_size",
    label: "RMS Spot Size",
    requiresTarget: true,
    defaultTarget: "0",
    expandsByFieldAndWavelength: true,
    nominalResidualCountPerSample: 1,
  },
  {
    kind: "rms_wavefront_error",
    label: "RMS wavefront error",
    requiresTarget: true,
    defaultTarget: "0",
    expandsByFieldAndWavelength: true,
    nominalResidualCountPerSample: 1,
  },
  {
    kind: "ray_fan",
    label: "Ray Fan",
    requiresTarget: false,
    expandsByFieldAndWavelength: true,
    nominalResidualCountPerSample: RAY_FAN_SAMPLES_PER_AXIS * 2,
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
