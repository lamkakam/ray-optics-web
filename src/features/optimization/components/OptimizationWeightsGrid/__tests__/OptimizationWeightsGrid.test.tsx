import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OptimizationWeightsGrid } from "@/features/optimization/components/OptimizationWeightsGrid";

jest.mock("@/shared/components/providers/ThemeProvider", () => ({
  useTheme: () => ({ theme: "light", setTheme: jest.fn() }),
}));

describe("OptimizationWeightsGrid", () => {
  it("uses a fixed-height, touch-scrollable normal AG Grid layout", () => {
    render(
      <OptimizationWeightsGrid
        rows={[{ id: "weight-0", index: 0, label: "0.7", weight: 1 }]}
        valueColumnWidth={120}
        onUpdateWeight={jest.fn()}
      />,
    );

    const grid = screen.getByTestId("ag-grid-mock");
    expect(grid.parentElement).toHaveClass("h-[200px]", "ag-grid-touch-scroll");
    expect(grid).toHaveAttribute("data-dom-layout", "normal");
    expect(grid).toHaveAttribute("data-suppress-touch", "true");
  });

  it("commits a pending weight edit before an outside action is handled", async () => {
    const user = userEvent.setup();
    const onAction = jest.fn();
    const onUpdateWeight = jest.fn();

    render(
      <div>
        <OptimizationWeightsGrid
          rows={[{ id: "weight-0", index: 0, label: "0.7", weight: 1 }]}
          valueColumnWidth={120}
          onUpdateWeight={onUpdateWeight}
        />
        <button type="button" onClick={onAction}>
          Consume weights
        </button>
      </div>
    );

    await user.clear(screen.getByRole("textbox"));
    await user.type(screen.getByRole("textbox"), "4.5");
    await user.click(screen.getByRole("button", { name: "Consume weights" }));

    expect(onUpdateWeight).toHaveBeenCalledWith(0, 4.5);
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("preserves uncommitted weight text across parent rerenders with replacement row objects", async () => {
    const user = userEvent.setup();
    const onUpdateWeight = jest.fn();
    const firstRows = [{ id: "weight-0", index: 0, label: "0.7", weight: 1 }];
    const secondRows = [{ id: "weight-0", index: 0, label: "0.7", weight: 1 }];

    const { rerender } = render(
      <OptimizationWeightsGrid
        rows={firstRows}
        valueColumnWidth={120}
        onUpdateWeight={onUpdateWeight}
      />,
    );

    await user.clear(screen.getByRole("textbox"));
    await user.type(screen.getByRole("textbox"), "4.5");

    rerender(
      <OptimizationWeightsGrid
        rows={secondRows}
        valueColumnWidth={120}
        onUpdateWeight={onUpdateWeight}
      />,
    );

    expect(screen.getByRole("textbox")).toHaveValue("4.5");
    expect(onUpdateWeight).not.toHaveBeenCalled();
  });
});
