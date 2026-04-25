import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it("renders Differential Evolution without method or least-squares tolerances", () => {
    render(
      <OptimizationAlgorithmTab
        optimizer={{
          kind: "differential_evolution",
          maxNumSteps: "200",
          relativeTolerance: "1e-2",
          absoluteTolerance: "0e+0",
        }}
        onChangeOptimizer={jest.fn()}
      />,
    );

    expect(screen.getByRole("option", { name: "Differential Evolution" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Method")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Relative tolerance")).toHaveValue("1e-2");
    expect(screen.getByLabelText("Absolute tolerance")).toHaveValue("0e+0");
    expect(screen.queryByLabelText("Merit function change tolerance")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Independent variable change tolerance")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Gradient tolerance")).not.toBeInTheDocument();
  });

  it("emits an optimizer-kind change when a different optimizer is selected", async () => {
    const user = userEvent.setup();
    const onChangeOptimizer = jest.fn();

    render(
      <OptimizationAlgorithmTab
        optimizer={{
          kind: "least_squares",
          method: "trf",
          maxNumSteps: "200",
          meritFunctionTolerance: "1e-5",
          independentVariableTolerance: "1e-5",
          gradientTolerance: "1e-5",
        }}
        onChangeOptimizer={onChangeOptimizer}
      />,
    );

    await user.selectOptions(screen.getByLabelText("Optimizer Kind"), "differential_evolution");

    expect(onChangeOptimizer).toHaveBeenCalledWith({ kind: "differential_evolution" });
  });
});
