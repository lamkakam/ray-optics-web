import type {
  OptimizerUiMetadataWithMethods,
  OptimizerUiMetadataWithoutMethods,
} from "@/features/optimization/lib/optimizerUiConfig";
import { OPTIMIZER_UI_CONFIG } from "@/features/optimization/lib/optimizerUiConfig";

const HYPOTHETICAL_METHODLESS_METADATA = {
  label: "Methodless Optimizer",
  canUseBounds: true,
  requiresResidualCountAtLeastVariableCount: false,
  tolerances: [],
} satisfies OptimizerUiMetadataWithoutMethods<"hypothetical_methodless">;

const LEAST_SQUARES_METADATA_WITH_METHODS = OPTIMIZER_UI_CONFIG.least_squares satisfies OptimizerUiMetadataWithMethods<"least_squares">;

// @ts-expect-error methodless metadata must declare canUseBounds at the top level
const METHODLESS_METADATA_MISSING_CAN_USE_BOUNDS: OptimizerUiMetadataWithoutMethods<"hypothetical_methodless"> = {
  label: "Invalid Methodless Optimizer",
  requiresResidualCountAtLeastVariableCount: false,
  tolerances: [],
};

// @ts-expect-error methodless metadata must declare requiresResidualCountAtLeastVariableCount at the top level
const METHODLESS_METADATA_MISSING_RESIDUAL_REQUIREMENT: OptimizerUiMetadataWithoutMethods<"hypothetical_methodless"> = {
  label: "Invalid Methodless Optimizer",
  canUseBounds: true,
  tolerances: [],
};

const METHODLESS_METADATA_WITH_METHODS: OptimizerUiMetadataWithoutMethods<"hypothetical_methodless"> = {
  label: "Invalid Methodless Optimizer",
  canUseBounds: true,
  requiresResidualCountAtLeastVariableCount: false,
  // @ts-expect-error methodless metadata cannot also declare per-method metadata
  methods: [],
  tolerances: [],
};

describe("optimizerUiConfig", () => {
  it("defines least-squares optimizer UI metadata", () => {
    expect(OPTIMIZER_UI_CONFIG).toHaveProperty("least_squares");
  });

  it("defines least-squares methods with labels and bound support", () => {
    expect(OPTIMIZER_UI_CONFIG.least_squares.methods).toEqual([
      {
        kind: "trf",
        canUseBounds: true,
        requiresResidualCountAtLeastVariableCount: false,
        label: "Trust Region Reflective",
      },
      {
        kind: "lm",
        canUseBounds: false,
        requiresResidualCountAtLeastVariableCount: true,
        label: "Levenberg-Marquardt",
      },
    ]);
  });

  it("defines least-squares tolerances with labels and defaults", () => {
    expect(OPTIMIZER_UI_CONFIG.least_squares.tolerances).toEqual([
      { kind: "ftol", label: "Merit function change tolerance", default: 1e-5 },
      { kind: "xtol", label: "Independent variable change tolerance", default: 1e-5 },
      { kind: "gtol", label: "Gradient tolerance", default: 1e-5 },
    ]);
  });

  it("keeps least-squares metadata method-based", () => {
    expect(LEAST_SQUARES_METADATA_WITH_METHODS.methods).toHaveLength(2);
  });

  it("accepts methodless optimizer metadata through the type contract", () => {
    expect(HYPOTHETICAL_METHODLESS_METADATA).toEqual({
      label: "Methodless Optimizer",
      canUseBounds: true,
      requiresResidualCountAtLeastVariableCount: false,
      tolerances: [],
    });
  });
});
