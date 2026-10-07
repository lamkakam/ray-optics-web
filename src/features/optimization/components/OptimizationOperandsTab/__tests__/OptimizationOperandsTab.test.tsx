import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OptimizationOperandsTab } from "@/features/optimization/components/OptimizationOperandsTab/OptimizationOperandsTab";
import type { OptimizationOperandRow } from "@/features/optimization/stores/optimizationStore";

/** Returns the mocked grid cell for one row and header name. */
function getCell(rowIndex: number, headerName: string): HTMLElement {
  const grid = screen.getByTestId("ag-grid-mock");
  const headers = Array.from(
    grid.querySelectorAll("th"),
    (header) => header.textContent,
  );
  const columnIndex = headers.indexOf(headerName);
  const row = grid.querySelectorAll("tbody tr")[rowIndex];
  return row.querySelectorAll("td")[columnIndex] as HTMLElement;
}

const edgeThicknessRow: OptimizationOperandRow = {
  id: "operand-2",
  kind: "edge_thickness",
  min: "3",
  max: undefined,
  surfaceIndex: undefined,
  weight: "1",
};

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
        surfaceCount={2}
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
    expect(screen.getByRole("button", { name: "Add operand" })).toHaveClass(
      "self-start",
    );
    expect(grid.parentElement).toHaveClass(
      "ag-grid-touch-scroll",
      "min-h-0",
      "flex-1",
    );
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
        operands={[
          { id: "operand-1", kind: "focal_length", target: "100", weight: "1" },
        ]}
        onAddOperand={onAddOperand}
        onDeleteOperand={onDeleteOperand}
        onUpdateOperand={onUpdateOperand}
        surfaceCount={2}
      />,
    );

    expect(screen.getByTestId("optimization-operands-tab")).not.toHaveClass(
      "overflow-y-auto",
    );
    expect(screen.getByTestId("ag-grid-mock")).toHaveAttribute(
      "data-default-col-def-suppress-movable",
      "true",
    );

    const headers = screen.getByTestId("ag-grid-mock").querySelectorAll("th");
    expect(Array.from(headers, (header) => header.textContent)).toEqual([
      "Operand Kind",
      "Target",
      "Weight",
      "Surface Index",
      "",
    ]);

    expect(
      screen.getByRole("option", { name: "OPD Difference" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "OPD Difference (Tangential)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "OPD Difference (Sagittal)" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Ray Fan" })).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Ray Fan (Tangential)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Ray Fan (Sagittal)" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add operand" }));
    expect(onAddOperand).toHaveBeenCalledTimes(1);

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Operand Kind" }),
      "opd_difference",
    );
    expect(onUpdateOperand).toHaveBeenCalledWith("operand-1", {
      kind: "opd_difference",
    });

    const inputs = screen.getAllByRole("textbox");
    await user.clear(inputs[0]);
    await user.type(inputs[0], "125");
    await user.tab();
    expect(onUpdateOperand).toHaveBeenCalledWith("operand-1", {
      target: "125",
    });

    await user.clear(inputs[1]);
    await user.type(inputs[1], "2.75");
    await user.tab();
    expect(onUpdateOperand).toHaveBeenCalledWith("operand-1", {
      weight: "2.75",
    });

    await user.click(
      screen.getByRole("button", { name: "Delete operand operand-1" }),
    );
    expect(onDeleteOperand).toHaveBeenCalledWith("operand-1");
  });

  it("renders N/A and disables target editing for ray_fan rows", () => {
    render(
      <OptimizationOperandsTab
        operands={[
          { id: "operand-1", kind: "ray_fan", target: undefined, weight: "1" },
        ]}
        onAddOperand={jest.fn()}
        onDeleteOperand={jest.fn()}
        onUpdateOperand={jest.fn()}
        surfaceCount={2}
      />,
    );

    expect(getCell(0, "Target")).toHaveTextContent("N/A");
    expect(getCell(0, "Surface Index")).toHaveTextContent("N/A");
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
  });

  it("commits a pending operand edit before a row action is handled", async () => {
    const user = userEvent.setup();
    const onDeleteOperand = jest.fn();
    const onUpdateOperand = jest.fn();

    render(
      <OptimizationOperandsTab
        operands={[
          { id: "operand-1", kind: "focal_length", target: "100", weight: "1" },
        ]}
        onAddOperand={jest.fn()}
        onDeleteOperand={onDeleteOperand}
        onUpdateOperand={onUpdateOperand}
        surfaceCount={2}
      />,
    );

    const inputs = screen.getAllByRole("textbox");
    await user.clear(inputs[1]);
    await user.type(inputs[1], "3.25");
    await user.click(
      screen.getByRole("button", { name: "Delete operand operand-1" }),
    );

    expect(onUpdateOperand).toHaveBeenCalledWith("operand-1", {
      weight: "3.25",
    });
    expect(onDeleteOperand).toHaveBeenCalledWith("operand-1");
  });

  it("preserves active uncommitted editor text across parent rerenders with replacement operand objects", async () => {
    const user = userEvent.setup();
    const onAddOperand = jest.fn();
    const onDeleteOperand = jest.fn();
    const onUpdateOperand = jest.fn();
    const firstOperands = [
      {
        id: "operand-1",
        kind: "focal_length" as const,
        target: "100",
        weight: "1",
      },
    ];
    const secondOperands = [
      {
        id: "operand-1",
        kind: "focal_length" as const,
        target: "100",
        weight: "1",
      },
    ];

    const { rerender } = render(
      <OptimizationOperandsTab
        operands={firstOperands}
        onAddOperand={onAddOperand}
        onDeleteOperand={onDeleteOperand}
        onUpdateOperand={onUpdateOperand}
        surfaceCount={2}
      />,
    );

    let inputs = screen.getAllByRole("textbox");
    await user.clear(inputs[0]);
    await user.type(inputs[0], "125");

    rerender(
      <OptimizationOperandsTab
        operands={secondOperands}
        onAddOperand={onAddOperand}
        onDeleteOperand={onDeleteOperand}
        onUpdateOperand={onUpdateOperand}
        surfaceCount={2}
      />,
    );

    inputs = screen.getAllByRole("textbox");
    expect(inputs[0]).toHaveValue("125");
    expect(inputs[1]).toHaveValue("1");
    expect(onUpdateOperand).not.toHaveBeenCalled();
  });

  it("shows a non-editable N/A Surface Index for system operands", () => {
    render(
      <OptimizationOperandsTab
        operands={[
          { id: "operand-1", kind: "focal_length", target: "100", weight: "1" },
        ]}
        onAddOperand={jest.fn()}
        onDeleteOperand={jest.fn()}
        onUpdateOperand={jest.fn()}
        surfaceCount={2}
      />,
    );

    const cell = getCell(0, "Surface Index");
    expect(cell).toHaveTextContent("N/A");
    expect(cell.querySelector("input")).toBeNull();
  });

  it("edits Edge Thickness bounds through two inputs in the Target cell", async () => {
    const user = userEvent.setup();
    const onUpdateOperand = jest.fn();
    render(
      <OptimizationOperandsTab
        operands={[edgeThicknessRow]}
        onAddOperand={jest.fn()}
        onDeleteOperand={jest.fn()}
        onUpdateOperand={onUpdateOperand}
        surfaceCount={2}
      />,
    );

    const targetCell = getCell(0, "Target");
    expect(targetCell).not.toHaveTextContent("N/A");
    const lower = screen.getByRole("textbox", {
      name: "Lower bound for operand operand-2",
    });
    const upper = screen.getByRole("textbox", {
      name: "Upper bound for operand operand-2",
    });
    expect(targetCell).toContainElement(lower);
    expect(targetCell).toContainElement(upper);
    expect(lower).toHaveValue("3");
    expect(upper).toHaveValue("");

    await user.type(upper, "8");
    expect(onUpdateOperand).toHaveBeenLastCalledWith("operand-2", {
      max: "8",
    });

    await user.clear(lower);
    expect(onUpdateOperand).toHaveBeenLastCalledWith("operand-2", { min: "" });
  });

  it("flags non-positive Edge Thickness bounds as invalid", () => {
    render(
      <OptimizationOperandsTab
        operands={[{ ...edgeThicknessRow, min: "0", max: "5" }]}
        onAddOperand={jest.fn()}
        onDeleteOperand={jest.fn()}
        onUpdateOperand={jest.fn()}
        surfaceCount={2}
      />,
    );

    expect(
      screen.getByRole("textbox", {
        name: "Lower bound for operand operand-2",
      }),
    ).toBeInvalid();
    expect(
      screen.getByRole("textbox", {
        name: "Upper bound for operand operand-2",
      }),
    ).toBeValid();
  });

  it("keeps the focused bound input and its text when the parent rerenders with replacement rows", async () => {
    const user = userEvent.setup();
    const onAddOperand = jest.fn();
    const onDeleteOperand = jest.fn();
    const onUpdateOperand = jest.fn();
    const renderTab = (operands: OptimizationOperandRow[]) => (
      <OptimizationOperandsTab
        operands={operands}
        onAddOperand={onAddOperand}
        onDeleteOperand={onDeleteOperand}
        onUpdateOperand={onUpdateOperand}
        surfaceCount={2}
      />
    );
    const { rerender } = render(renderTab([edgeThicknessRow]));

    await user.type(
      screen.getByRole("textbox", {
        name: "Upper bound for operand operand-2",
      }),
      "8",
    );
    rerender(renderTab([{ ...edgeThicknessRow, max: "8" }]));

    const upper = screen.getByRole("textbox", {
      name: "Upper bound for operand operand-2",
    });
    expect(upper).toHaveFocus();
    expect(upper).toHaveValue("8");
  });

  it("edits the Edge Thickness Surface Index within the real surfaces only", async () => {
    const user = userEvent.setup();
    const onUpdateOperand = jest.fn();
    render(
      <OptimizationOperandsTab
        operands={[{ ...edgeThicknessRow, surfaceIndex: 1 }]}
        onAddOperand={jest.fn()}
        onDeleteOperand={jest.fn()}
        onUpdateOperand={onUpdateOperand}
        surfaceCount={2}
      />,
    );

    const input = getCell(0, "Surface Index").querySelector(
      "input",
    ) as HTMLInputElement;
    expect(input).toHaveValue("1");

    const commit = async (text: string) => {
      await user.click(input);
      await user.clear(input);
      await user.type(input, `${text}{Enter}`);
      await user.tab();
    };

    for (const rejected of ["3", "0", "1.5"]) {
      await commit(rejected);
    }
    expect(onUpdateOperand).not.toHaveBeenCalled();

    await commit("2");
    expect(onUpdateOperand).toHaveBeenLastCalledWith("operand-2", {
      surfaceIndex: 2,
    });

    await commit("");
    expect(onUpdateOperand).toHaveBeenLastCalledWith("operand-2", {
      surfaceIndex: undefined,
    });
  });

  it("configures AG Grid's number editor with the real surface range", () => {
    render(
      <OptimizationOperandsTab
        operands={[edgeThicknessRow]}
        onAddOperand={jest.fn()}
        onDeleteOperand={jest.fn()}
        onUpdateOperand={jest.fn()}
        surfaceCount={5}
      />,
    );

    const header = screen.getByRole("columnheader", { name: "Surface Index" });
    expect(header).toHaveAttribute("data-cell-editor", "agNumberCellEditor");
    expect(
      JSON.parse(header.getAttribute("data-cell-editor-params") ?? "{}"),
    ).toEqual({ min: 1, max: 5, precision: 0, step: 1 });
  });
});
