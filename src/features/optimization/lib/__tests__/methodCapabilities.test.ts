import { getOptimizationAlgorithmCapabilities } from "@/features/optimization/lib/methodCapabilities";
import {
  formatOptimizerUiDefaultValue,
  OPTIMIZER_UI_CONFIG,
} from "@/features/optimization/lib/optimizerUiConfig";
import { getOptimizationOperandMetadata } from "@/features/optimization/lib/operandMetadata";
import type { OptimizationOperandKind } from "@/features/optimization/types/optimizationWorkerTypes";

describe("methodCapabilities", () => {
  it("derives capabilities from the optimizer UI config", () => {
    for (const method of OPTIMIZER_UI_CONFIG.least_squares.methods) {
      expect(
        getOptimizationAlgorithmCapabilities({
          kind: "least_squares",
          method: method.kind,
        }),
      ).toEqual({
        canUseBounds: method.canUseBounds,
        canOptimizeGlass: method.canOptimizeGlass,
        requiresResidualCountAtLeastVariableCount:
          method.requiresResidualCountAtLeastVariableCount,
      });
    }
  });

  it("derives methodless optimizer capabilities from the optimizer UI config", () => {
    expect(
      getOptimizationAlgorithmCapabilities({ kind: "differential_evolution" }),
    ).toEqual({
      canUseBounds: true,
      canOptimizeGlass: false,
      requiresResidualCountAtLeastVariableCount: false,
    });

    expect(
      getOptimizationAlgorithmCapabilities({ kind: "glass_expert" }),
    ).toEqual({
      canUseBounds: true,
      canOptimizeGlass: true,
      requiresResidualCountAtLeastVariableCount: false,
    });
  });

  it("keeps the user-facing optimizer metadata and formatted defaults stable", () => {
    expect(OPTIMIZER_UI_CONFIG.least_squares.label).toBe("Least Squares");
    expect(OPTIMIZER_UI_CONFIG.least_squares.methods).toEqual([
      expect.objectContaining({
        kind: "trf",
        label: "Trust Region Reflective",
        canOptimizeGlass: false,
      }),
      expect.objectContaining({
        kind: "lm",
        label: "Levenberg-Marquardt",
        canOptimizeGlass: false,
      }),
    ]);
    expect(OPTIMIZER_UI_CONFIG.differential_evolution.numericFields[0]).toEqual(
      expect.objectContaining({
        kind: "max_nfev",
        label: "Max. num of steps",
      }),
    );
    expect(formatOptimizerUiDefaultValue(200)).toBe("2e+2");
    expect(formatOptimizerUiDefaultValue(1)).toBe("1e+0");
  });

  it("rejects an unknown operand kind at the shared metadata boundary", () => {
    expect(() =>
      getOptimizationOperandMetadata("unknown" as OptimizationOperandKind),
    ).toThrow("Unknown optimization operand kind: unknown");
  });
});
