import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OptimizationAlgorithmTab } from "@/features/optimization/components/OptimizationAlgorithmTab/OptimizationAlgorithmTab";
import { formatOptimizerUiDefaultValue, OPTIMIZER_UI_CONFIG } from "@/features/optimization/lib/optimizerUiConfig";

describe("OptimizationAlgorithmTab", () => {
  it("renders optimizer methods and numeric fields from shared UI config", () => {
    const numericFields = OPTIMIZER_UI_CONFIG.least_squares.numericFields;
    render(
      <OptimizationAlgorithmTab
        optimizer={{
          kind: "least_squares",
          method: "trf",
          max_nfev: "200",
          ftol: formatOptimizerUiDefaultValue(
            numericFields[1].default,
          ),
          xtol: formatOptimizerUiDefaultValue(
            numericFields[2].default,
          ),
          gtol: formatOptimizerUiDefaultValue(
            numericFields[3].default,
          ),
        }}
        onChangeOptimizer={jest.fn()}
      />,
    );

    for (const method of OPTIMIZER_UI_CONFIG.least_squares.methods) {
      expect(screen.getByRole("option", { name: method.label })).toBeInTheDocument();
    }

    for (const field of numericFields) {
      const expectedValue = field.validation === "positiveInteger"
        ? String(field.default)
        : formatOptimizerUiDefaultValue(field.default);
      expect(screen.getByLabelText(field.label)).toHaveValue(expectedValue);
    }
  });

  it("renders Differential Evolution without method or least-squares tolerances", () => {
    render(
      <OptimizationAlgorithmTab
        optimizer={{
          kind: "differential_evolution",
          max_nfev: "200",
          tol: "1e-2",
          atol: "0e+0",
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
          max_nfev: "200",
          ftol: "1e-5",
          xtol: "1e-5",
          gtol: "1e-5",
        }}
        onChangeOptimizer={onChangeOptimizer}
      />,
    );

    await user.selectOptions(screen.getByLabelText("Optimizer Kind"), "differential_evolution");

    expect(onChangeOptimizer).toHaveBeenCalledWith({ kind: "differential_evolution" });
  });

  it("renders Glass Expert numeric fields from shared UI metadata without a Method selector", () => {
    render(
      <OptimizationAlgorithmTab
        optimizer={{
          kind: "glass_expert",
          num_neighbours: "7",
          maxiter: "1000",
          tol: "1e-3",
        }}
        onChangeOptimizer={jest.fn()}
      />,
    );

    expect(screen.getByRole("option", { name: "Glass Expert" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Method")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Num. of neighbours")).toHaveValue("7");
    expect(screen.getByLabelText("Max. iterations per refinement run")).toHaveValue("1000");
    expect(screen.queryByLabelText("Max. num of iterations")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Tolerance")).toHaveValue("1e-3");
    expect(screen.queryByLabelText("Max. num of steps")).not.toBeInTheDocument();
  });

  it("emits metadata-driven Glass Expert numeric field changes", async () => {
    const user = userEvent.setup();
    const onChangeOptimizer = jest.fn();

    render(
      <OptimizationAlgorithmTab
        optimizer={{
          kind: "glass_expert",
          num_neighbours: "7",
          maxiter: "1000",
          tol: "1e-3",
        }}
        onChangeOptimizer={onChangeOptimizer}
      />,
    );

    await user.type(screen.getByLabelText("Num. of neighbours"), "9");

    expect(onChangeOptimizer).toHaveBeenLastCalledWith({ num_neighbours: "79" });
  });
});
