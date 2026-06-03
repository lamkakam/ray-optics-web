import { render, screen } from "@testing-library/react";
import { OptimizationEvaluationPanel } from "@/features/optimization/components/OptimizationEvaluationPanel/OptimizationEvaluationPanel";
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

  it("renders an invalid config message before the empty state text", () => {
    render(
      <OptimizationEvaluationPanel
        rows={[]}
        isEvaluating={false}
        invalidConfigMessage="Variable minimum must be less than maximum."
      />,
    );

    const invalidMessage = screen.getByText("Variable minimum must be less than maximum.");
    const emptyState = screen.getByText(
      "Evaluation results appear here when the current optimization config is valid.",
    );

    expect(invalidMessage).toBeInTheDocument();
    cx.text.size.placeholderFontSize.split(" ").forEach((token) => {
      expect(invalidMessage).toHaveClass(token);
    });
    cx.text.color.errorTextColor.split(" ").forEach((token) => {
      expect(invalidMessage).toHaveClass(token);
    });
    expect(invalidMessage.compareDocumentPosition(emptyState) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByTestId("optimization-evaluation-scroll")).not.toBeInTheDocument();
  });

  it("renders a warning message before the empty state text", () => {
    render(
      <OptimizationEvaluationPanel
        rows={[]}
        isEvaluating={false}
        warningMessage="Optimization failed to converge."
      />,
    );

    const warningMessage = screen.getByText("Optimization failed to converge.");
    const emptyState = screen.getByText(
      "Evaluation results appear here when the current optimization config is valid.",
    );

    cx.text.color.errorTextColor.split(" ").forEach((token) => {
      expect(warningMessage).toHaveClass(token);
    });
    expect(warningMessage.compareDocumentPosition(emptyState) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByTestId("optimization-evaluation-scroll")).not.toBeInTheDocument();
  });

  it("renders a warning message before the table when rows are present", () => {
    render(
      <OptimizationEvaluationPanel
        rows={[["Paraxial focal length", "100", "1.000000", "98.500000"]]}
        isEvaluating={false}
        warningMessage="Optimization failed to converge."
      />,
    );

    const warningMessage = screen.getByText("Optimization failed to converge.");
    const table = screen.getByRole("table");

    cx.text.color.errorTextColor.split(" ").forEach((token) => {
      expect(warningMessage).toHaveClass(token);
    });
    expect(warningMessage.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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
