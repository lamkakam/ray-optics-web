import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OptimizationOperandsTab } from "@/features/optimization/components/OptimizationOperandsTab/OptimizationOperandsTab";

jest.mock("@/shared/components/providers/ThemeProvider", () => ({
  useTheme: () => ({ theme: "light", setTheme: jest.fn() }),
}));

describe("OptimizationOperandsTab", () => {
  it("matches the responsive Lens Prescription height while reserving space above the grid", () => {
    render(
      <OptimizationOperandsTab
        operands={[]}
        onAddOperand={jest.fn()}
        onDeleteOperand={jest.fn()}
        onUpdateOperand={jest.fn()}
      />,
    );

    const tab = screen.getByTestId("optimization-operands-tab");
    const grid = screen.getByTestId("ag-grid-mock");
    expect(tab).toHaveClass(
      "flex",
      "flex-col",
      "gap-4",
      "h-[calc(100vh-160px)]",
      "min-[1440px]:h-full",
      "min-[1440px]:min-h-[200px]",
    );
    expect(screen.getByRole("button", { name: "Add operand" })).toHaveClass("self-start");
    expect(grid.parentElement).toHaveClass("ag-grid-touch-scroll", "min-h-0", "flex-1");
    expect(grid).toHaveAttribute("data-dom-layout", "normal");
    expect(grid).toHaveAttribute("data-suppress-touch", "false");
  });

  it("renders the operands grid and wires add, edit, and delete actions", async () => {
    const user = userEvent.setup();
    const onAddOperand = jest.fn();
    const onDeleteOperand = jest.fn();
    const onUpdateOperand = jest.fn();

    render(
      <OptimizationOperandsTab
        operands={[{ id: "operand-1", kind: "focal_length", target: "100", weight: "1" }]}
        onAddOperand={onAddOperand}
        onDeleteOperand={onDeleteOperand}
        onUpdateOperand={onUpdateOperand}
      />,
    );

    expect(screen.getByTestId("optimization-operands-tab")).not.toHaveClass("overflow-y-auto");
    expect(screen.getByTestId("ag-grid-mock")).toHaveAttribute("data-default-col-def-suppress-movable", "true");

    const headers = screen.getByTestId("ag-grid-mock").querySelectorAll("th");
    expect(Array.from(headers, (header) => header.textContent)).toEqual([
      "Operand Kind",
      "Target",
      "Weight",
      "",
    ]);

    expect(screen.getByRole("option", { name: "OPD Difference" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "OPD Difference (Tangential)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "OPD Difference (Sagittal)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Ray Fan" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Ray Fan (Tangential)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Ray Fan (Sagittal)" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add operand" }));
    expect(onAddOperand).toHaveBeenCalledTimes(1);

    await user.selectOptions(screen.getByRole("combobox", { name: "Operand Kind" }), "opd_difference");
    expect(onUpdateOperand).toHaveBeenCalledWith("operand-1", { kind: "opd_difference" });

    const inputs = screen.getAllByRole("textbox");
    await user.clear(inputs[0]);
    await user.type(inputs[0], "125");
    await user.tab();
    expect(onUpdateOperand).toHaveBeenCalledWith("operand-1", { target: "125" });

    await user.clear(inputs[1]);
    await user.type(inputs[1], "2.75");
    await user.tab();
    expect(onUpdateOperand).toHaveBeenCalledWith("operand-1", { weight: "2.75" });

    await user.click(screen.getByRole("button", { name: "Delete operand operand-1" }));
    expect(onDeleteOperand).toHaveBeenCalledWith("operand-1");
  });

  it("renders N/A and disables target editing for ray_fan rows", () => {
    render(
      <OptimizationOperandsTab
        operands={[{ id: "operand-1", kind: "ray_fan", target: undefined, weight: "1" }]}
        onAddOperand={jest.fn()}
        onDeleteOperand={jest.fn()}
        onUpdateOperand={jest.fn()}
      />,
    );

    expect(screen.getByText("N/A")).toBeInTheDocument();
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
  });

  it("commits a pending operand edit before a row action is handled", async () => {
    const user = userEvent.setup();
    const onDeleteOperand = jest.fn();
    const onUpdateOperand = jest.fn();

    render(
      <OptimizationOperandsTab
        operands={[{ id: "operand-1", kind: "focal_length", target: "100", weight: "1" }]}
        onAddOperand={jest.fn()}
        onDeleteOperand={onDeleteOperand}
        onUpdateOperand={onUpdateOperand}
      />,
    );

    const inputs = screen.getAllByRole("textbox");
    await user.clear(inputs[1]);
    await user.type(inputs[1], "3.25");
    await user.click(screen.getByRole("button", { name: "Delete operand operand-1" }));

    expect(onUpdateOperand).toHaveBeenCalledWith("operand-1", { weight: "3.25" });
    expect(onDeleteOperand).toHaveBeenCalledWith("operand-1");
  });

  it("preserves uncommitted target and weight text across parent rerenders with replacement operand objects", async () => {
    const onUpdateOperand = jest.fn();
    const firstOperands = [{ id: "operand-1", kind: "focal_length" as const, target: "100", weight: "1" }];
    const secondOperands = [{ id: "operand-1", kind: "focal_length" as const, target: "100", weight: "1" }];

    const { rerender } = render(
      <OptimizationOperandsTab
        operands={firstOperands}
        onAddOperand={jest.fn()}
        onDeleteOperand={jest.fn()}
        onUpdateOperand={onUpdateOperand}
      />,
    );

    let inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "125" } });
    fireEvent.change(inputs[1], { target: { value: "2.75" } });

    rerender(
      <OptimizationOperandsTab
        operands={secondOperands}
        onAddOperand={jest.fn()}
        onDeleteOperand={jest.fn()}
        onUpdateOperand={onUpdateOperand}
      />,
    );

    inputs = screen.getAllByRole("textbox");
    expect(inputs[0]).toHaveValue("125");
    expect(inputs[1]).toHaveValue("2.75");
    expect(onUpdateOperand).not.toHaveBeenCalled();
  });
});
