import { getOptimizationMethodCapabilities } from "@/features/optimization/lib/methodCapabilities";
import { OPTIMIZER_UI_CONFIG } from "@/features/optimization/lib/optimizerUiConfig";

describe("methodCapabilities", () => {
  it("derives bound support from the optimizer UI config", () => {
    for (const method of OPTIMIZER_UI_CONFIG.least_squares.methods) {
      expect(getOptimizationMethodCapabilities(method.kind)).toMatchObject({
        canUseBounds: method.use_bounds,
      });
    }
  });

  it("keeps the lm residual-count constraint", () => {
    expect(getOptimizationMethodCapabilities("trf")).toEqual({
      canUseBounds: true,
      requiresResidualCountAtLeastVariableCount: false,
    });
    expect(getOptimizationMethodCapabilities("lm")).toEqual({
      canUseBounds: false,
      requiresResidualCountAtLeastVariableCount: true,
    });
  });
});
