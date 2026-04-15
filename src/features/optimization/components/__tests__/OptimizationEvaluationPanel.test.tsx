import React from "react";
import { render, screen } from "@testing-library/react";
import { OptimizationEvaluationPanel } from "@/features/optimization/components/OptimizationEvaluationPanel";

describe("OptimizationEvaluationPanel", () => {
  it("renders the empty state when there are no rows", () => {
    render(<OptimizationEvaluationPanel rows={[]} isEvaluating={false} />);

    expect(screen.getByText("Operand Evaluation")).toBeInTheDocument();
    expect(screen.getByText("Evaluation results appear here when the current optimization config is valid.")).toBeInTheDocument();
    expect(screen.queryByTestId("optimization-evaluation-scroll")).not.toBeInTheDocument();
  });

  it("renders the evaluation table and updating status", () => {
    render(
      <OptimizationEvaluationPanel
        isEvaluating
        rows={[["Paraxial focal length", "100", "1", "98.5"]]}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Updating evaluation…");
    expect(screen.getByTestId("optimization-evaluation-scroll")).toHaveClass("max-h-64", "overflow-y-auto");
    expect(screen.getByText("Paraxial focal length")).toBeInTheDocument();
    expect(screen.getByText("98.5")).toBeInTheDocument();
  });
});
