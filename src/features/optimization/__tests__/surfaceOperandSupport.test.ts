/**
 * Exercises the surface-scoped operand paths before any production kind uses them
 * by registering one fake surface kind per target mode through the operand
 * metadata registry factory.
 */
import {
  OPTIMIZATION_ADJUSTABLE_TARGET_OPERAND_KINDS,
  OPTIMIZATION_FIXED_TARGET_OPERAND_KINDS,
  OPTIMIZATION_RANGE_OPERAND_KINDS,
  OPTIMIZATION_SURFACE_ADJUSTABLE_TARGET_OPERAND_KINDS,
  OPTIMIZATION_SURFACE_FIXED_TARGET_OPERAND_KINDS,
  OPTIMIZATION_SURFACE_RANGE_OPERAND_KINDS,
  isOptimizationAdjustableTargetOperandKind,
  isOptimizationFixedTargetOperandKind,
  isOptimizationRangeOperandKind,
  isOptimizationSurfaceOperandKind,
} from "@/features/optimization/lib/operandMetadata";
import { adaptOptimizationRunConfigToGuiState } from "@/features/optimization/lib/optimizationConfigAdapter";
import { createOptimizationRunConfigValidator } from "@/features/optimization/lib/optimizationConfigSchema";
import type {
  OptimizationConfig,
  OptimizationOperandConfig,
  OptimizationOperandKind,
} from "@/features/optimization/types/optimizationWorkerTypes";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";

jest.mock("@/features/optimization/lib/operandMetadata", () => {
  const actual = jest.requireActual(
    "@/features/optimization/lib/operandMetadata",
  );
  const shared = {
    expandsByFieldAndWavelength: true,
    getNominalResidualCountPerSample: () => 1,
    scope: "surface",
  };
  return {
    ...actual,
    ...actual.createOptimizationOperandMetadataRegistry([
      ...actual.OPTIMIZATION_OPERAND_METADATA,
      {
        ...shared,
        kind: "fake_surface_target",
        label: "Fake Surface Target",
        goal: "adjustable_target",
        defaultTarget: "0",
      },
      {
        ...shared,
        kind: "fake_surface_fixed",
        label: "Fake Surface Fixed",
        goal: "fixed_target",
      },
      {
        ...shared,
        kind: "fake_surface_range",
        label: "Fake Surface Range",
        goal: "range",
        defaultRange: { min: "1", max: "2" },
      },
    ]),
  };
});

/** No production kind is surface-scoped yet, so fake kinds are typed as the empty surface kinds. */
const FAKE_SURFACE_KINDS = [
  "fake_surface_target",
  "fake_surface_fixed",
  "fake_surface_range",
] as never[];

const model: OpticalModel = {
  setAutoAperture: "manualAperture",
  object: { distance: 1e10, medium: "air", manufacturer: "" },
  image: { curvatureRadius: 0 },
  surfaces: [
    {
      label: "Default",
      curvatureRadius: 50,
      thickness: 5,
      medium: "BK7",
      manufacturer: "Schott",
      semiDiameter: 10,
    },
    {
      label: "Default",
      curvatureRadius: -50,
      thickness: 40,
      medium: "air",
      manufacturer: "",
      semiDiameter: 10,
    },
  ],
  specs: {
    pupil: { space: "object", type: "epd", value: 12.5 },
    field: {
      space: "object",
      type: "angle",
      maxField: 20,
      fields: [0],
      isRelative: true,
    },
    wavelengths: { weights: [[587.562, 1]], referenceIndex: 0 },
  },
};

const sampling = {
  fields: [{ index: 0, weight: 1 }],
  wavelengths: [{ index: 0, weight: 1 }],
};

function configWith(
  operands: ReadonlyArray<Record<string, unknown>>,
): OptimizationConfig {
  return {
    optimizer: {
      kind: "least_squares",
      method: "trf",
      max_nfev: 200,
      ftol: 1e-5,
      xtol: 1e-5,
      gtol: 1e-5,
    },
    variables: [],
    pickups: [],
    merit_function: {
      operands: operands as unknown as ReadonlyArray<OptimizationOperandConfig>,
    },
  };
}

describe("surface operand metadata registry", () => {
  it("lists surface kinds only in their surface groups", () => {
    expect(OPTIMIZATION_SURFACE_ADJUSTABLE_TARGET_OPERAND_KINDS).toEqual([
      "fake_surface_target",
    ]);
    expect(OPTIMIZATION_SURFACE_FIXED_TARGET_OPERAND_KINDS).toEqual([
      "fake_surface_fixed",
    ]);
    expect(OPTIMIZATION_SURFACE_RANGE_OPERAND_KINDS).toEqual([
      "fake_surface_range",
    ]);
    const systemKinds: ReadonlyArray<OptimizationOperandKind> = [
      ...OPTIMIZATION_ADJUSTABLE_TARGET_OPERAND_KINDS,
      ...OPTIMIZATION_FIXED_TARGET_OPERAND_KINDS,
      ...OPTIMIZATION_RANGE_OPERAND_KINDS,
    ];
    for (const kind of FAKE_SURFACE_KINDS) {
      expect(systemKinds).not.toContain(kind);
    }
  });

  it.each(FAKE_SURFACE_KINDS)(
    "guards %s as surface-scoped and not as a system kind",
    (kind) => {
      expect(isOptimizationSurfaceOperandKind(kind)).toBe(true);
      expect(isOptimizationAdjustableTargetOperandKind(kind)).toBe(false);
      expect(isOptimizationFixedTargetOperandKind(kind)).toBe(false);
      expect(isOptimizationRangeOperandKind(kind)).toBe(false);
    },
  );

  it("does not guard system kinds as surface-scoped", () => {
    expect(isOptimizationSurfaceOperandKind("focal_length")).toBe(false);
    expect(isOptimizationSurfaceOperandKind("ray_fan")).toBe(false);
  });
});

describe("surface operand config schema", () => {
  const validate = createOptimizationRunConfigValidator();

  it.each([
    [{ kind: "fake_surface_target", target: 1 }],
    [{ kind: "fake_surface_fixed" }],
    [{ kind: "fake_surface_range", min: 1 }],
    [{ kind: "fake_surface_range", min: 1, max: 2 }],
  ])("accepts a surface operand %p with a surface index", (operand) => {
    expect(
      validate(configWith([{ ...operand, surface_index: 1, weight: 1 }])),
    ).toBe(true);
  });

  it.each([
    ["no surface index", { kind: "fake_surface_fixed", weight: 1 }],
    [
      "surface index 0",
      { kind: "fake_surface_fixed", weight: 1, surface_index: 0 },
    ],
    [
      "a negative surface index",
      { kind: "fake_surface_fixed", weight: 1, surface_index: -1 },
    ],
    [
      "a fractional surface index",
      { kind: "fake_surface_fixed", weight: 1, surface_index: 1.5 },
    ],
    [
      "a string surface index",
      { kind: "fake_surface_fixed", weight: 1, surface_index: "1" },
    ],
    [
      "no target on a target kind",
      { kind: "fake_surface_target", weight: 1, surface_index: 1 },
    ],
    [
      "a target on a fixed-target kind",
      { kind: "fake_surface_fixed", weight: 1, surface_index: 1, target: 0 },
    ],
    [
      "no bound on a range kind",
      { kind: "fake_surface_range", weight: 1, surface_index: 1 },
    ],
    [
      "a surface index on a system target kind",
      { kind: "focal_length", weight: 1, target: 1, surface_index: 1 },
    ],
    [
      "a surface index on a system fixed-target kind",
      { kind: "ray_fan", weight: 1, surface_index: 1 },
    ],
  ])("rejects an operand with %s", (_, operand) => {
    expect(validate(configWith([operand]))).toBe(false);
  });
});

describe("surface operand GUI config adapter", () => {
  it.each([
    [{ kind: "fake_surface_target", target: 1.5 }, { target: "1.5" }],
    [{ kind: "fake_surface_fixed" }, { target: undefined }],
    [
      { kind: "fake_surface_range", max: 3 },
      { target: undefined, min: undefined, max: "3" },
    ],
  ])("keeps the surface index of %p on its row", (operand, rowFields) => {
    const state = adaptOptimizationRunConfigToGuiState(
      configWith([{ ...operand, surface_index: 2, weight: 2, ...sampling }]),
      model,
    );

    expect(state.operands).toEqual([
      {
        id: "optimization-operand-0",
        kind: operand.kind,
        weight: "2",
        surfaceIndex: 2,
        ...rowFields,
      },
    ]);
  });

  it("rejects a surface index beyond the model's last real surface", () => {
    expect(() =>
      adaptOptimizationRunConfigToGuiState(
        configWith([
          { kind: "fake_surface_fixed", surface_index: 3, weight: 1 },
        ]),
        model,
      ),
    ).toThrow("fake_surface_fixed surface index is out of range.");
  });
});
