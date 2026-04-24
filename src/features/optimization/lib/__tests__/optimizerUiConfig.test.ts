import { OPTIMIZER_UI_CONFIG } from "@/features/optimization/lib/optimizerUiConfig";

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
});
