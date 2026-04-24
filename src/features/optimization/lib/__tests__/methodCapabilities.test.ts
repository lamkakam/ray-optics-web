import { getOptimizationMethodCapabilities } from "@/features/optimization/lib/methodCapabilities";
import { OPTIMIZER_UI_CONFIG } from "@/features/optimization/lib/optimizerUiConfig";

describe("methodCapabilities", () => {
  it("derives capabilities from the optimizer UI config", () => {
    for (const method of OPTIMIZER_UI_CONFIG.least_squares.methods) {
      expect(getOptimizationMethodCapabilities(method.kind)).toEqual({
        canUseBounds: method.canUseBounds,
        requiresResidualCountAtLeastVariableCount: method.requiresResidualCountAtLeastVariableCount,
      });
    }
  });
});
