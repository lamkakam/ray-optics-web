import { getOptimizationAlgorithmCapabilities } from "@/features/optimization/lib/methodCapabilities";
import { OPTIMIZER_UI_CONFIG } from "@/features/optimization/lib/optimizerUiConfig";

describe("methodCapabilities", () => {
  it("derives capabilities from the optimizer UI config", () => {
    for (const method of OPTIMIZER_UI_CONFIG.least_squares.methods) {
      expect(getOptimizationAlgorithmCapabilities({ kind: "least_squares", method: method.kind })).toEqual({
        canUseBounds: method.canUseBounds,
        requiresResidualCountAtLeastVariableCount: method.requiresResidualCountAtLeastVariableCount,
      });
    }
  });

  it("derives methodless optimizer capabilities from the optimizer UI config", () => {
    expect(getOptimizationAlgorithmCapabilities({ kind: "differential_evolution" })).toEqual({
      canUseBounds: true,
      requiresResidualCountAtLeastVariableCount: false,
    });
  });
});
