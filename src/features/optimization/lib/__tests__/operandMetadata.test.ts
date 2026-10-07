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
  getOptimizationOperandMetadata,
  isOptimizationRangeOperandKind,
  isOptimizationSurfaceOperandKind,
  isOptimizationSurfaceRangeOperandKind,
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
    expect(OPTIMIZATION_OPERAND_METADATA).toHaveLength(11);
  });

  it("registers Edge Thickness as the only surface-scoped kind, a positive range with a 3 mm default lower bound", () => {
    expect(OPTIMIZATION_SURFACE_ADJUSTABLE_TARGET_OPERAND_KINDS).toEqual([]);
    expect(OPTIMIZATION_SURFACE_FIXED_TARGET_OPERAND_KINDS).toEqual([]);
    expect(OPTIMIZATION_SURFACE_RANGE_OPERAND_KINDS).toEqual([
      "edge_thickness",
    ]);
    expect(
      OPTIMIZATION_OPERAND_METADATA.filter(({ kind }) =>
        isOptimizationSurfaceOperandKind(kind),
      ).map(({ kind }) => kind),
    ).toEqual(["edge_thickness"]);
    const metadata = getOptimizationOperandMetadata("edge_thickness");
    expect(metadata).toMatchObject({
      label: "Edge Thickness",
      goal: "range",
      scope: "surface",
      defaultRange: { min: "3" },
      requiresPositiveBounds: true,
      expandsByFieldAndWavelength: false,
    });
    expect(metadata.defaultRange?.max).toBeUndefined();
    expect(metadata.getNominalResidualCountPerSample()).toBe(1);
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
    expect(isOptimizationSurfaceRangeOperandKind("ray_fan")).toBe(false);
    expect(isOptimizationSurfaceRangeOperandKind("focal_length")).toBe(false);
    expect(isOptimizationSurfaceRangeOperandKind("edge_thickness")).toBe(true);
    expect(isOptimizationSurfaceOperandKind("edge_thickness")).toBe(true);
    expect(isOptimizationRangeOperandKind("edge_thickness")).toBe(false);
    expect(isOptimizationAdjustableTargetOperandKind("edge_thickness")).toBe(
      false,
    );
    expect(isOptimizationFixedTargetOperandKind("edge_thickness")).toBe(false);
  });
});
