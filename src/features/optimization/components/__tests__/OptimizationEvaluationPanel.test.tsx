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
        maxBodyHeight={320}
        allowBodyScroll
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Updating evaluation…");
    expect(screen.getByTestId("optimization-evaluation-scroll")).toHaveClass("overflow-y-auto");
    expect(screen.getByTestId("optimization-evaluation-scroll")).toHaveStyle({ maxHeight: "320px" });
    expect(screen.getByText("Paraxial focal length")).toBeInTheDocument();
    expect(screen.getByText("98.5")).toBeInTheDocument();
  });

  it("renders the full table without an internal vertical scrollbar when body scrolling is disabled", () => {
    render(
      <OptimizationEvaluationPanel
        isEvaluating={false}
        rows={[["Paraxial focal length", "100", "1", "98.5"]]}
        allowBodyScroll={false}
      />,
    );

    expect(screen.getByTestId("optimization-evaluation-scroll")).not.toHaveClass("overflow-y-auto");
    expect(screen.getByTestId("optimization-evaluation-scroll")).not.toHaveStyle({ maxHeight: "320px" });
  });
});
