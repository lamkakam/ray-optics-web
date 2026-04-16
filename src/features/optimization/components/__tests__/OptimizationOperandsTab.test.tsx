import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OptimizationOperandsTab } from "@/features/optimization/components/OptimizationOperandsTab";

jest.mock("@/shared/components/providers/ThemeProvider", () => ({
  useTheme: () => ({ theme: "light", setTheme: jest.fn() }),
}));

describe("OptimizationOperandsTab", () => {
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

    const headers = screen.getByTestId("ag-grid-mock").querySelectorAll("th");
    expect(Array.from(headers, (header) => header.textContent)).toEqual([
      "Operand Kind",
      "Target",
      "Weight",
      "",
    ]);

    expect(screen.getByRole("option", { name: "OPD Difference" })).toBeInTheDocument();

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
});
