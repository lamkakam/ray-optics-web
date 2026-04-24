import React from "react";
import { render, screen } from "@testing-library/react";
import { OptimizationAlgorithmTab } from "@/features/optimization/components/OptimizationAlgorithmTab";
import { formatOptimizerUiDefaultValue, OPTIMIZER_UI_CONFIG } from "@/features/optimization/lib/optimizerUiConfig";

describe("OptimizationAlgorithmTab", () => {
  it("renders optimizer methods and tolerances from shared UI config", () => {
    render(
      <OptimizationAlgorithmTab
        optimizer={{
          kind: "least_squares",
          method: "trf",
          maxNumSteps: "200",
          meritFunctionTolerance: formatOptimizerUiDefaultValue(
            OPTIMIZER_UI_CONFIG.least_squares.tolerances[0].default,
          ),
          independentVariableTolerance: formatOptimizerUiDefaultValue(
            OPTIMIZER_UI_CONFIG.least_squares.tolerances[1].default,
          ),
          gradientTolerance: formatOptimizerUiDefaultValue(
            OPTIMIZER_UI_CONFIG.least_squares.tolerances[2].default,
          ),
        }}
        onChangeOptimizer={jest.fn()}
      />,
    );

    for (const method of OPTIMIZER_UI_CONFIG.least_squares.methods) {
      expect(screen.getByRole("option", { name: method.label })).toBeInTheDocument();
    }

    for (const tolerance of OPTIMIZER_UI_CONFIG.least_squares.tolerances) {
      expect(screen.getByLabelText(tolerance.label)).toHaveValue(formatOptimizerUiDefaultValue(tolerance.default));
    }
  });
});
