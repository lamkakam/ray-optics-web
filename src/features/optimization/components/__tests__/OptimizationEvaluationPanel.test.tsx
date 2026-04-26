import { render, screen } from "@testing-library/react";
import { OptimizationEvaluationPanel } from "@/features/optimization/components/OptimizationEvaluationPanel";
import { componentTokens as cx } from "@/shared/tokens/styleTokens";

describe("OptimizationEvaluationPanel", () => {
  it("renders the empty state when there are no rows", () => {
    render(<OptimizationEvaluationPanel rows={[]} isEvaluating={false} />);

    expect(screen.getByText("Operand Evaluation")).toBeInTheDocument();
    const emptyState = screen.getByText(
      "Evaluation results appear here when the current optimization config is valid.",
    );
    expect(emptyState).toBeInTheDocument();
    expect(emptyState).toHaveClass("px-4", "py-3");
    cx.text.color.placeholderTextColor.split(" ").forEach((token) => {
      expect(emptyState).toHaveClass(token);
    });
    cx.text.size.placeholderFontSize.split(" ").forEach((token) => {
      expect(emptyState).toHaveClass(token);
    });
    cx.text.color.bodyTextColor.split(" ").forEach((token) => {
      expect(emptyState).not.toHaveClass(token);
    });
    expect(screen.queryByTestId("optimization-evaluation-scroll")).not.toBeInTheDocument();
  });

  it("renders the evaluation table and updating status", () => {
    render(
      <OptimizationEvaluationPanel
        isEvaluating
        rows={[["Paraxial focal length", "100", "1.000000", "98.500000"]]}
        maxBodyHeight={320}
        allowBodyScroll
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Updating evaluation…");
    expect(screen.getByTestId("optimization-evaluation-scroll")).toHaveClass("overflow-y-auto");
    expect(screen.getByTestId("optimization-evaluation-scroll")).toHaveStyle({ maxHeight: "320px" });
    expect(screen.getByText("Paraxial focal length")).toBeInTheDocument();
    expect(screen.getByText("98.500000")).toBeInTheDocument();

    const headers = screen.getAllByRole("columnheader");
    expect(headers[0]).toHaveClass("text-left");
    expect(headers[1]).toHaveClass("text-right");
    expect(headers[2]).toHaveClass("text-right");
    expect(headers[3]).toHaveClass("text-right");

    const cells = screen.getAllByRole("cell");
    expect(cells[0]).toHaveClass("text-left");
    expect(cells[1]).toHaveClass("text-right");
    expect(cells[2]).toHaveClass("text-right");
    expect(cells[3]).toHaveClass("text-right");
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

  it("renders N/A targets for target-less residual rows", () => {
    render(
      <OptimizationEvaluationPanel
        isEvaluating={false}
        rows={[["Ray Fan", "N/A", "1.000000", "0.125000"]]}
      />,
    );

    expect(screen.getByText("Ray Fan")).toBeInTheDocument();
    expect(screen.getByText("N/A")).toBeInTheDocument();
  });
});
