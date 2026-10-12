/**
 * Exercises the system-or-surface operand paths with the production third-order
 * aberration kinds: the worker config schema and the GUI config adapter accept
 * them without `surface_index` (System) and with a real surface index.
 */
import { adaptOptimizationRunConfigToGuiState } from "@/features/optimization/lib/optimizationConfigAdapter";
import { createOptimizationRunConfigValidator } from "@/features/optimization/lib/optimizationConfigSchema";
import type {
  OptimizationConfig,
  OptimizationOperandConfig,
} from "@/features/optimization/types/optimizationWorkerTypes";
import type { OpticalModel } from "@/shared/lib/optical-model/model/opticalModel";

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

describe("system-or-surface operand config schema", () => {
  const validate = createOptimizationRunConfigValidator();

  it.each([
    ["the System scope", {}],
    ["a surface index", { surface_index: 2 }],
  ])("accepts a third-order operand at %s", (_, scopeFields) => {
    expect(
      validate(
        configWith([
          {
            kind: "primary_lateral_chromatic_aberration",
            target: -0.1,
            weight: 1,
            ...scopeFields,
          },
        ]),
      ),
    ).toBe(true);
  });

  it.each([
    ["surface index 0", { target: 0, surface_index: 0 }],
    ["a fractional surface index", { target: 0, surface_index: 1.5 }],
    ["a string surface index", { target: 0, surface_index: "1" }],
    ["no target", { surface_index: 1 }],
    ["range bounds", { target: 0, min: 1 }],
  ])("rejects a third-order operand with %s", (_, fields) => {
    expect(
      validate(
        configWith([{ kind: "third_order_coma", weight: 1, ...fields }]),
      ),
    ).toBe(false);
  });
});

describe("system-or-surface operand GUI config adapter", () => {
  it("keeps a third-order operand without surface_index at the System scope", () => {
    const state = adaptOptimizationRunConfigToGuiState(
      configWith([
        { kind: "third_order_field_curvature", target: 0.5, weight: 2 },
      ]),
      model,
    );

    expect(state.operands).toEqual([
      {
        id: "optimization-operand-0",
        kind: "third_order_field_curvature",
        target: "0.5",
        weight: "2",
      },
    ]);
  });

  it("keeps the surface index of a third-order operand on its row", () => {
    const state = adaptOptimizationRunConfigToGuiState(
      configWith([
        {
          kind: "third_order_field_curvature",
          target: 0.5,
          weight: 2,
          surface_index: 2,
        },
      ]),
      model,
    );

    expect(state.operands).toEqual([
      {
        id: "optimization-operand-0",
        kind: "third_order_field_curvature",
        target: "0.5",
        weight: "2",
        surfaceIndex: 2,
      },
    ]);
  });

  it("rejects a surface index beyond the model's last real surface", () => {
    expect(() =>
      adaptOptimizationRunConfigToGuiState(
        configWith([
          {
            kind: "third_order_coma",
            target: 0,
            weight: 1,
            surface_index: 3,
          },
        ]),
        model,
      ),
    ).toThrow("third_order_coma surface index is out of range.");
  });
});
