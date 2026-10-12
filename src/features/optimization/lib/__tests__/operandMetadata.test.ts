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
  isOptimizationSystemOrSurfaceOperandKind,
} from "@/features/optimization/lib/operandMetadata";

const THIRD_ORDER_KINDS_AND_LABELS = [
  ["third_order_spherical_aberration", "3rd-Order Spherical Aberr. (W040)"],
  ["third_order_coma", "3rd-Order Coma (W131)"],
  ["third_order_astigmatism", "3rd-Order Astigmatism (W222)"],
  ["third_order_petzval_curvature", "3rd-Order Petzval Curvature (W220P)"],
  ["third_order_field_curvature", "3rd-Order Field Curvature (W220)"],
  ["third_order_distortion", "3rd-Order Distortion (W311)"],
  [
    "primary_axial_chromatic_aberration",
    "Primary Axial Chromatic Aberr. (W020)",
  ],
  [
    "primary_lateral_chromatic_aberration",
    "Primary Lateral Chromatic Aberr. (W111)",
  ],
] as const;
const THIRD_ORDER_KINDS = THIRD_ORDER_KINDS_AND_LABELS.map(([kind]) => kind);

describe("operand metadata registry", () => {
  it("partitions production kinds into adjustable-target, fixed-target, and (empty) range groups", () => {
    expect(OPTIMIZATION_ADJUSTABLE_TARGET_OPERAND_KINDS).toEqual([
      "focal_length",
      "f_number",
      ...THIRD_ORDER_KINDS,
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
    expect(OPTIMIZATION_OPERAND_METADATA).toHaveLength(19);
  });

  it("lists the third-order aberration kinds right after Paraxial f/#", () => {
    const labels = OPTIMIZATION_OPERAND_METADATA.map(({ label }) => label);
    expect(labels.slice(0, 10)).toEqual([
      "Paraxial focal length",
      "Paraxial f/#",
      ...THIRD_ORDER_KINDS_AND_LABELS.map(([, label]) => label),
    ]);
  });

  it.each(THIRD_ORDER_KINDS)(
    "registers %s as a system-or-surface adjustable-target kind with a zero default target",
    (kind) => {
      const metadata = getOptimizationOperandMetadata(kind);
      expect(metadata).toMatchObject({
        goal: "adjustable_target",
        scope: "system_or_surface",
        defaultTarget: "0",
        expandsByFieldAndWavelength: false,
      });
      expect(metadata.getNominalResidualCountPerSample()).toBe(1);
      expect(isOptimizationSystemOrSurfaceOperandKind(kind)).toBe(true);
      expect(isOptimizationSurfaceOperandKind(kind)).toBe(true);
      expect(isOptimizationAdjustableTargetOperandKind(kind)).toBe(true);
      expect(isOptimizationSurfaceRangeOperandKind(kind)).toBe(false);
    },
  );

  it("registers Edge Thickness as the only surface-only kind, a positive range with a 3 mm default lower bound", () => {
    expect(OPTIMIZATION_SURFACE_ADJUSTABLE_TARGET_OPERAND_KINDS).toEqual(
      THIRD_ORDER_KINDS,
    );
    expect(OPTIMIZATION_SURFACE_FIXED_TARGET_OPERAND_KINDS).toEqual([]);
    expect(OPTIMIZATION_SURFACE_RANGE_OPERAND_KINDS).toEqual([
      "edge_thickness",
    ]);
    expect(
      OPTIMIZATION_OPERAND_METADATA.filter(({ kind }) =>
        isOptimizationSurfaceOperandKind(kind),
      ).map(({ kind }) => kind),
    ).toEqual([...THIRD_ORDER_KINDS, "edge_thickness"]);
    expect(
      OPTIMIZATION_OPERAND_METADATA.filter(({ kind }) =>
        isOptimizationSystemOrSurfaceOperandKind(kind),
      ).map(({ kind }) => kind),
    ).toEqual(THIRD_ORDER_KINDS);
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
    expect(isOptimizationSystemOrSurfaceOperandKind("edge_thickness")).toBe(
      false,
    );
    expect(isOptimizationSystemOrSurfaceOperandKind("focal_length")).toBe(
      false,
    );
    expect(isOptimizationSurfaceOperandKind("focal_length")).toBe(false);
  });
});
