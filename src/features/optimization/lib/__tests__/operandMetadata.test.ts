/** Shared operand metadata groups every production kind by target mode. */
import {
  OPTIMIZATION_ADJUSTABLE_TARGET_OPERAND_KINDS,
  OPTIMIZATION_FIXED_TARGET_OPERAND_KINDS,
  OPTIMIZATION_OPERAND_METADATA,
  OPTIMIZATION_RANGE_OPERAND_KINDS,
  OPTIMIZATION_SURFACE_ADJUSTABLE_TARGET_OPERAND_KINDS,
  OPTIMIZATION_SURFACE_FIXED_TARGET_OPERAND_KINDS,
  OPTIMIZATION_SURFACE_RANGE_OPERAND_KINDS,
  isOptimizationAdjustableTargetOperandKind,
  isOptimizationFixedTargetOperandKind,
  isOptimizationRangeOperandKind,
  isOptimizationSurfaceOperandKind,
} from "@/features/optimization/lib/operandMetadata";

describe("operand metadata registry", () => {
  it("partitions production kinds into adjustable-target, fixed-target, and (empty) range groups", () => {
    expect(OPTIMIZATION_ADJUSTABLE_TARGET_OPERAND_KINDS).toEqual([
      "focal_length",
      "f_number",
      "opd_difference",
      "opd_difference_tangential",
      "opd_difference_sagittal",
      "rms_spot_size",
      "rms_wavefront_error",
    ]);
    expect(OPTIMIZATION_FIXED_TARGET_OPERAND_KINDS).toEqual([
      "ray_fan",
      "ray_fan_tangential",
      "ray_fan_sagittal",
    ]);
    expect(OPTIMIZATION_RANGE_OPERAND_KINDS).toEqual([]);
    expect(OPTIMIZATION_OPERAND_METADATA).toHaveLength(10);
  });

  it("registers no surface-scoped production kinds yet", () => {
    expect(OPTIMIZATION_SURFACE_ADJUSTABLE_TARGET_OPERAND_KINDS).toEqual([]);
    expect(OPTIMIZATION_SURFACE_FIXED_TARGET_OPERAND_KINDS).toEqual([]);
    expect(OPTIMIZATION_SURFACE_RANGE_OPERAND_KINDS).toEqual([]);
    expect(
      OPTIMIZATION_OPERAND_METADATA.filter(({ kind }) =>
        isOptimizationSurfaceOperandKind(kind),
      ),
    ).toEqual([]);
  });

  it("guards each kind into exactly its own group", () => {
    expect(isOptimizationAdjustableTargetOperandKind("focal_length")).toBe(
      true,
    );
    expect(isOptimizationFixedTargetOperandKind("focal_length")).toBe(false);
    expect(isOptimizationRangeOperandKind("focal_length")).toBe(false);
    expect(isOptimizationAdjustableTargetOperandKind("ray_fan")).toBe(false);
    expect(isOptimizationFixedTargetOperandKind("ray_fan")).toBe(true);
    expect(isOptimizationRangeOperandKind("ray_fan")).toBe(false);
  });
});
