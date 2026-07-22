/**
## Key Conventions

- `label` is the user-facing operand name shown in selectors and evaluation tables.
- `requiresTarget` controls whether the UI and config builder require a numeric `target`.
- `defaultTarget` is only present for targeted operands.
- Type definitions for operand metadata and options live in `features/optimization/types/optimizationOperandTypes.ts`.
- `defaultOptions` carries caller-owned default operand options when an operand needs them.
- `expandsByFieldAndWavelength` determines whether store config assembly attaches field and wavelength weight arrays.
- OPD Difference variants are targeted scalar operands with default target `"0"` and field/wavelength expansion. The combined operand keeps both fan axes, while `opd_difference_tangential` and `opd_difference_sagittal` select one axis.
- Ray Fan variants are target-less vector operands with default `options.num_rays = 21` and field/wavelength expansion. The combined operand contributes both axes, while `ray_fan_tangential` and `ray_fan_sagittal` select one axis.
- `getNominalResidualCountPerSample(options)` is used for deterministic `lm` pre-validation. `ray_fan` contributes `num_rays * 2` residuals per field/wavelength, while axis-specific Ray Fan operands contribute `num_rays`.*/
import type { OptimizationOperandKind } from "@/features/optimization/types/optimizationWorkerTypes";
import type { OptimizationOperandMetadata } from "@/features/optimization/types/optimizationOperandTypes";

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
    kind: "opd_difference_tangential",
    label: "OPD Difference (Tangential)",
    requiresTarget: true,
    defaultTarget: "0",
    expandsByFieldAndWavelength: true,
    getNominalResidualCountPerSample: () => 1,
  },
  {
    kind: "opd_difference_sagittal",
    label: "OPD Difference (Sagittal)",
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
  {
    kind: "ray_fan_tangential",
    label: "Ray Fan (Tangential)",
    requiresTarget: false,
    defaultOptions: { num_rays: 21 },
    expandsByFieldAndWavelength: true,
    getNominalResidualCountPerSample: (options) => options?.num_rays ?? 21,
  },
  {
    kind: "ray_fan_sagittal",
    label: "Ray Fan (Sagittal)",
    requiresTarget: false,
    defaultOptions: { num_rays: 21 },
    expandsByFieldAndWavelength: true,
    getNominalResidualCountPerSample: (options) => options?.num_rays ?? 21,
  },
] as const;

const OPTIMIZATION_OPERAND_METADATA_BY_KIND = new Map(
  OPTIMIZATION_OPERAND_METADATA.map((metadata) => [metadata.kind, metadata] as const),
);

/**
Defines the shared optimization operand metadata consumed by the store and operand/evaluation UI.*/
export function getOptimizationOperandMetadata(kind: OptimizationOperandKind): OptimizationOperandMetadata {
  const metadata = OPTIMIZATION_OPERAND_METADATA_BY_KIND.get(kind);
  if (metadata === undefined) {
    throw new Error(`Unknown optimization operand kind: ${kind}`);
  }
  return metadata;
}
