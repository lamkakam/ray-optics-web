import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  OptimizationOperandsTab,
  shouldSuppressOperandRangeEditorTab,
} from "@/features/optimization/components/OptimizationOperandsTab/OptimizationOperandsTab";
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

const thirdOrderRow: OptimizationOperandRow = {
  id: "operand-3",
  kind: "third_order_coma",
  target: "0",
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
    expect(cell.querySelector("select")).toBeNull();
  });

  it.each([
    ["only a lower bound", "3", undefined, "≥ 3"],
    ["only an upper bound", undefined, "8", "≤ 8"],
    ["both bounds", "3", "8", "3 ≤ x ≤ 8"],
    ["a blank upper bound", "3", "  ", "≥ 3"],
    ["a blank lower bound", "", "8", "≤ 8"],
  ])(
    "shows a range with %s as read-only text while not editing",
    (_, min, max, text) => {
      render(
        <OptimizationOperandsTab
          operands={[{ ...edgeThicknessRow, min, max }]}
          onAddOperand={jest.fn()}
          onDeleteOperand={jest.fn()}
          onUpdateOperand={jest.fn()}
          surfaceCount={2}
        />,
      );

      const targetCell = getCell(0, "Target");
      expect(targetCell.textContent).toBe(text);
      expect(targetCell.querySelector("input")).toBeNull();
    },
  );

  it("edits Edge Thickness bounds in a cell editor and commits both bounds once", async () => {
    const user = userEvent.setup();
    const onUpdateOperand = jest.fn();
    const onCellEditingStarted = jest.fn();
    const onCellEditingStopped = jest.fn();
    render(
      <OptimizationOperandsTab
        operands={[edgeThicknessRow]}
        onAddOperand={jest.fn()}
        onDeleteOperand={jest.fn()}
        onUpdateOperand={onUpdateOperand}
        surfaceCount={2}
        onCellEditingStarted={onCellEditingStarted}
        onCellEditingStopped={onCellEditingStopped}
      />,
    );

    const targetCell = getCell(0, "Target");
    await user.dblClick(within(targetCell).getByText("≥ 3"));
    expect(onCellEditingStarted).toHaveBeenCalledTimes(1);

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
    expect(lower).toHaveFocus();

    await user.type(upper, "8{Enter}");

    expect(onUpdateOperand).toHaveBeenCalledTimes(1);
    expect(onUpdateOperand).toHaveBeenCalledWith("operand-2", {
      min: "3",
      max: "8",
    });
    expect(onCellEditingStopped).toHaveBeenCalledTimes(1);
  });

  it("discards range edits cancelled with Escape", async () => {
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

    await user.dblClick(within(getCell(0, "Target")).getByText("≥ 3"));
    await user.type(
      screen.getByRole("textbox", {
        name: "Upper bound for operand operand-2",
      }),
      "8{Escape}",
    );

    expect(onUpdateOperand).not.toHaveBeenCalled();
    expect(getCell(0, "Target")).toHaveTextContent("≥ 3");
  });

  it("does not patch the row when a range edit commits unchanged bounds", async () => {
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

    await user.dblClick(within(getCell(0, "Target")).getByText("≥ 3"));
    await user.keyboard("{Enter}");

    expect(onUpdateOperand).not.toHaveBeenCalled();
  });

  it("flags non-positive Edge Thickness bounds as invalid in the editor", async () => {
    const user = userEvent.setup();
    render(
      <OptimizationOperandsTab
        operands={[{ ...edgeThicknessRow, min: "0", max: "5" }]}
        onAddOperand={jest.fn()}
        onDeleteOperand={jest.fn()}
        onUpdateOperand={jest.fn()}
        surfaceCount={2}
      />,
    );

    await user.dblClick(within(getCell(0, "Target")).getByText("0 ≤ x ≤ 5"));

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

  it("keeps the active range editor and its text when the parent rerenders with replacement rows", async () => {
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

    await user.dblClick(within(getCell(0, "Target")).getByText("≥ 3"));
    await user.type(
      screen.getByRole("textbox", {
        name: "Upper bound for operand operand-2",
      }),
      "8",
    );
    rerender(renderTab([{ ...edgeThicknessRow }]));

    const upper = screen.getByRole("textbox", {
      name: "Upper bound for operand operand-2",
    });
    expect(upper).toHaveFocus();
    expect(upper).toHaveValue("8");
    expect(onUpdateOperand).not.toHaveBeenCalled();
  });

  it("edits the Edge Thickness Surface Index with a select of the real surfaces only", async () => {
    const user = userEvent.setup();
    const onUpdateOperand = jest.fn();
    render(
      <OptimizationOperandsTab
        operands={[{ ...edgeThicknessRow, surfaceIndex: 1 }]}
        onAddOperand={jest.fn()}
        onDeleteOperand={jest.fn()}
        onUpdateOperand={onUpdateOperand}
        surfaceCount={3}
      />,
    );

    const select = screen.getByRole("combobox", { name: "Surface Index" });
    expect(
      Array.from(
        (select as HTMLSelectElement).options,
        (option) => option.textContent,
      ),
    ).toEqual(["1", "2", "3"]);
    expect(select).toHaveValue("1");

    await user.selectOptions(select, "3");
    expect(onUpdateOperand).toHaveBeenLastCalledWith("operand-2", {
      surfaceIndex: 3,
    });
  });

  it("offers System and every real surface for a third-order operand, showing System when unset", async () => {
    const user = userEvent.setup();
    const onUpdateOperand = jest.fn();
    const { rerender } = render(
      <OptimizationOperandsTab
        operands={[thirdOrderRow]}
        onAddOperand={jest.fn()}
        onDeleteOperand={jest.fn()}
        onUpdateOperand={onUpdateOperand}
        surfaceCount={2}
      />,
    );

    const select = screen.getByRole("combobox", { name: "Surface Index" });
    expect(
      Array.from(
        (select as HTMLSelectElement).options,
        (option) => option.textContent,
      ),
    ).toEqual(["System", "1", "2"]);
    expect(select).toHaveValue("System");

    await user.selectOptions(select, "2");
    expect(onUpdateOperand).toHaveBeenLastCalledWith("operand-3", {
      surfaceIndex: 2,
    });

    rerender(
      <OptimizationOperandsTab
        operands={[{ ...thirdOrderRow, surfaceIndex: 2 }]}
        onAddOperand={jest.fn()}
        onDeleteOperand={jest.fn()}
        onUpdateOperand={onUpdateOperand}
        surfaceCount={2}
      />,
    );
    const updated = screen.getByRole("combobox", { name: "Surface Index" });
    expect(updated).toHaveValue("2");

    await user.selectOptions(updated, "System");
    expect(onUpdateOperand).toHaveBeenLastCalledWith("operand-3", {
      surfaceIndex: undefined,
    });
  });

  it("lists the third-order operands right after Paraxial f/# in the Operand Kind selector", () => {
    render(
      <OptimizationOperandsTab
        operands={[thirdOrderRow]}
        onAddOperand={jest.fn()}
        onDeleteOperand={jest.fn()}
        onUpdateOperand={jest.fn()}
        surfaceCount={2}
      />,
    );

    const options = Array.from(
      (
        screen.getByRole("combobox", {
          name: "Operand Kind",
        }) as HTMLSelectElement
      ).options,
      (option) => option.textContent,
    );
    expect(options.slice(1, 10)).toEqual([
      "Paraxial f/#",
      "3rd-Order Spherical Aberr. (W040)",
      "3rd-Order Coma (W131)",
      "3rd-Order Astigmatism (W222)",
      "3rd-Order Petzval Curvature (W220P)",
      "3rd-Order Field Curvature (W220)",
      "3rd-Order Distortion (W311)",
      "Primary Axial Chromatic Aberr. (W020)",
      "Primary Lateral Chromatic Aberr. (W111)",
    ]);
  });
});

describe("shouldSuppressOperandRangeEditorTab", () => {
  /** Builds a range-editor wrapper with lower and upper inputs, as `OperandRangeCell` renders it. */
  function createEditorInputs(): readonly [HTMLInputElement, HTMLInputElement] {
    const editor = document.createElement("div");
    editor.setAttribute("data-operand-range-editor", "");
    const lower = document.createElement("input");
    const upper = document.createElement("input");
    editor.append(lower, upper);
    return [lower, upper];
  }

  /** Returns a keydown event dispatched from `target`, so its `target` is set. */
  function keydownFrom(
    target: HTMLElement,
    init: KeyboardEventInit,
  ): KeyboardEvent {
    const event = new KeyboardEvent("keydown", init);
    target.dispatchEvent(event);
    return event;
  }

  it.each([
    ["Tab on the lower bound", true, 0, { key: "Tab" }],
    ["Shift+Tab on the lower bound", false, 0, { key: "Tab", shiftKey: true }],
    ["Tab on the upper bound", false, 1, { key: "Tab" }],
    ["Shift+Tab on the upper bound", true, 1, { key: "Tab", shiftKey: true }],
    ["a non-Tab key", false, 0, { key: "ArrowRight" }],
  ])("for %s returns %s", (_, expected, inputIndex, init) => {
    const inputs = createEditorInputs();

    expect(
      shouldSuppressOperandRangeEditorTab(
        keydownFrom(inputs[inputIndex], init),
      ),
    ).toBe(expected);
  });

  it("does not suppress Tab outside a range editor", () => {
    const input = document.createElement("input");

    expect(
      shouldSuppressOperandRangeEditorTab(keydownFrom(input, { key: "Tab" })),
    ).toBe(false);
  });
});
