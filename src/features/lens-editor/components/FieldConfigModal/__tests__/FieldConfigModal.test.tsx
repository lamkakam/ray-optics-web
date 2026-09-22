import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FieldConfigModal } from "@/features/lens-editor/components/FieldConfigModal";

// Mock useTheme — default to light
jest.mock("@/shared/components/providers/ThemeProvider", () => ({
  useTheme: () => ({ theme: "light", toggleTheme: jest.fn() }),
}));

const defaultProps = {
  isOpen: true,
  initialSpace: "object" as const,
  initialType: "angle" as const,
  initialMaxField: 20,
  initialFields: [0, 0.7, 1],
  initialIsWideAngle: false,
  onApply: jest.fn(),
  onClose: jest.fn(),
};

function getGridValueInputs(): HTMLInputElement[] {
  return within(screen.getByTestId("ag-grid-mock")).getAllByRole(
    "textbox",
  ) as HTMLInputElement[];
}

describe("FieldConfigModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does not render when isOpen is false", () => {
    render(<FieldConfigModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders a dialog when isOpen is true", () => {
    render(<FieldConfigModal {...defaultProps} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("renders Half-Field title", () => {
    render(<FieldConfigModal {...defaultProps} />);
    expect(screen.getByText("Half-Field")).toBeInTheDocument();
  });

  it("renders field space dropdown with Object/Image options", () => {
    render(<FieldConfigModal {...defaultProps} />);
    const dropdown = screen.getByLabelText("Field space");
    expect(dropdown).toBeInTheDocument();
    const options = within(dropdown).getAllByRole("option");
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent("Object");
    expect(options[1]).toHaveTextContent("Image");
  });

  it("renders field type dropdown with Height/Angle options", () => {
    render(<FieldConfigModal {...defaultProps} />);
    const dropdown = screen.getByLabelText("Field type");
    expect(dropdown).toBeInTheDocument();
    const options = within(dropdown).getAllByRole("option");
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent("Height");
    expect(options[1]).toHaveTextContent("Angle");
  });

  it("offers only Height for image-space fields", () => {
    render(
      <FieldConfigModal
        {...defaultProps}
        initialSpace="image"
        initialType="height"
      />,
    );

    const dropdown = screen.getByLabelText("Field type");
    const options = within(dropdown).getAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent("Height");
    expect(options[0]).toHaveValue("height");
  });

  it("switches an object angle field to height when Image is selected", async () => {
    const onApply = jest.fn();
    render(<FieldConfigModal {...defaultProps} onApply={onApply} />);

    await userEvent.selectOptions(
      screen.getByLabelText("Field space"),
      "image",
    );
    expect(screen.getByLabelText("Field type")).toHaveValue("height");
    expect(
      within(screen.getByLabelText("Field type")).queryByRole("option", {
        name: "Angle",
      }),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByText("Apply"));
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        space: "image",
        type: "height",
      }),
    );
  });

  it("renders max half-field textbox with initial value", () => {
    render(<FieldConfigModal {...defaultProps} />);
    const input = screen.getByLabelText("Max half-field value");
    expect(input).toHaveValue("20");
  });

  it("defaults to relative fields and shows the relative field controls", () => {
    render(<FieldConfigModal {...defaultProps} />);

    expect(
      screen.getByRole("checkbox", { name: "Use absolute fields" }),
    ).not.toBeChecked();
    expect(
      within(screen.getByTestId("ag-grid-mock")).getByRole("columnheader", {
        name: "Relative Field",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Maximum 10 relative fields")).toBeInTheDocument();
  });

  it("opens imported absolute fields without converting their samples", () => {
    render(
      <FieldConfigModal
        {...defaultProps}
        initialFields={[-10, 0, 4]}
        initialIsRelative={false}
      />,
    );

    expect(
      screen.getByRole("checkbox", { name: "Use absolute fields" }),
    ).toBeChecked();
    expect(
      screen.queryByLabelText("Max half-field value"),
    ).not.toBeInTheDocument();
    expect(
      within(screen.getByTestId("ag-grid-mock")).getByRole("columnheader", {
        name: "Field",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Maximum 10 fields")).toBeInTheDocument();
    expect(getGridValueInputs().map((input) => input.value)).toEqual([
      "-10",
      "0",
      "4",
    ]);
  });

  it("keeps grid values and the hidden maximum draft when toggling modes", async () => {
    const user = userEvent.setup();
    render(<FieldConfigModal {...defaultProps} />);

    const maxField = screen.getByLabelText("Max half-field value");
    await user.clear(maxField);
    await user.type(maxField, "45");
    await user.click(
      screen.getByRole("checkbox", { name: "Use absolute fields" }),
    );

    expect(
      screen.queryByLabelText("Max half-field value"),
    ).not.toBeInTheDocument();
    expect(getGridValueInputs().map((input) => input.value)).toEqual([
      "0",
      "0.7",
      "1",
    ]);

    await user.click(
      screen.getByRole("checkbox", { name: "Use absolute fields" }),
    );

    expect(screen.getByLabelText("Max half-field value")).toHaveValue("45");
    expect(
      within(screen.getByTestId("ag-grid-mock")).getByRole("columnheader", {
        name: "Relative Field",
      }),
    ).toBeInTheDocument();
  });

  it("renders ag-grid with initial fields", () => {
    render(<FieldConfigModal {...defaultProps} />);
    const grid = screen.getByTestId("ag-grid-mock");
    expect(grid).toBeInTheDocument();
    // 3 rows for [0, 0.7, 1]
    const rows = within(grid).getAllByRole("row");
    // header row + 3 data rows
    expect(rows).toHaveLength(4);
  });

  it("uses a fixed-height, touch-scrollable normal AG Grid layout", () => {
    render(<FieldConfigModal {...defaultProps} />);

    const grid = screen.getByTestId("ag-grid-mock");
    expect(grid.parentElement).toHaveClass(
      "h-[200px]",
      "min-[1440px]:h-[400px]",
      "ag-grid-touch-scroll",
    );
    expect(grid).toHaveAttribute("data-dom-layout", "normal");
    expect(grid).toHaveAttribute("data-suppress-touch", "false");
  });

  it("renders add row button for each row", () => {
    render(<FieldConfigModal {...defaultProps} />);
    const addBtns = screen.getAllByLabelText("Add field row");
    expect(addBtns).toHaveLength(3);
  });

  it("does not render delete button for first row", () => {
    render(<FieldConfigModal {...defaultProps} initialFields={[0]} />);
    expect(screen.queryByLabelText("Delete field row")).not.toBeInTheDocument();
  });

  it("renders delete button for non-first rows", () => {
    render(<FieldConfigModal {...defaultProps} />);
    const deleteBtns = screen.getAllByLabelText("Delete field row");
    // rows 2 and 3 have delete buttons (not the first)
    expect(deleteBtns).toHaveLength(2);
  });

  it("adds a row when add button is clicked (up to 10)", async () => {
    render(<FieldConfigModal {...defaultProps} initialFields={[0]} />);
    const addBtn = screen.getByLabelText("Add field row");
    await userEvent.click(addBtn);

    const grid = screen.getByTestId("ag-grid-mock");
    const rows = within(grid).getAllByRole("row");
    // header + 2 data rows
    expect(rows).toHaveLength(3);
  });

  it("does not add more than 10 rows", async () => {
    const tenFields = Array.from({ length: 10 }, (_, i) => i * 0.1);
    render(<FieldConfigModal {...defaultProps} initialFields={tenFields} />);
    const addBtns = screen.getAllByLabelText("Add field row");
    await userEvent.click(addBtns[0]);

    const grid = screen.getByTestId("ag-grid-mock");
    const rows = within(grid).getAllByRole("row");
    // header + 10 data rows (unchanged)
    expect(rows).toHaveLength(11);
  });

  it("deletes a row when delete button is clicked", async () => {
    render(<FieldConfigModal {...defaultProps} />);
    const deleteBtns = screen.getAllByLabelText("Delete field row");
    await userEvent.click(deleteBtns[0]);

    const grid = screen.getByTestId("ag-grid-mock");
    const rows = within(grid).getAllByRole("row");
    // header + 2 data rows
    expect(rows).toHaveLength(3);
  });

  it("calls onClose when Cancel is clicked", async () => {
    const onClose = jest.fn();
    render(<FieldConfigModal {...defaultProps} onClose={onClose} />);

    await userEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onApply when Cancel is clicked", async () => {
    const onApply = jest.fn();
    render(<FieldConfigModal {...defaultProps} onApply={onApply} />);

    await userEvent.click(screen.getByText("Cancel"));
    expect(onApply).not.toHaveBeenCalled();
  });

  it("calls onApply with current draft state when Apply is clicked", async () => {
    const onApply = jest.fn();
    render(<FieldConfigModal {...defaultProps} onApply={onApply} />);

    await userEvent.click(screen.getByText("Apply"));
    expect(onApply).toHaveBeenCalledWith({
      space: "object",
      type: "angle",
      maxField: 20,
      fields: [0, 0.7, 1],
      isRelative: true,
      isWideAngle: false,
    });
  });

  it("commits a pending relative field edit before Apply is handled", async () => {
    const user = userEvent.setup();
    const onApply = jest.fn();
    render(<FieldConfigModal {...defaultProps} onApply={onApply} />);

    const inputs = screen.getAllByRole("textbox");
    await user.clear(inputs[1]);
    await user.type(inputs[1], "0.25");
    await user.click(screen.getByText("Apply"));

    expect(onApply).toHaveBeenCalledWith({
      space: "object",
      type: "angle",
      maxField: 20,
      fields: [0.25, 0.7, 1],
      isRelative: true,
      isWideAngle: false,
    });
  });

  it("does not call onClose when Escape is pressed", async () => {
    const onClose = jest.fn();
    render(<FieldConfigModal {...defaultProps} onClose={onClose} />);

    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(0);
  });

  it("does not call onClose when backdrop is clicked", async () => {
    const onClose = jest.fn();
    render(<FieldConfigModal {...defaultProps} onClose={onClose} />);

    await userEvent.click(screen.getByTestId("modal-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(0);
  });

  it("renders info text about maximum 10 relative fields", () => {
    render(<FieldConfigModal {...defaultProps} />);
    expect(screen.getByText("Maximum 10 relative fields")).toBeInTheDocument();
  });

  it("renders wide angle checkbox underneath the grid", () => {
    render(<FieldConfigModal {...defaultProps} />);
    expect(
      screen.getByRole("checkbox", {
        name: "Use wide angle mode for more robust ray aiming",
      }),
    ).toBeInTheDocument();
  });

  it("wide angle checkbox is unchecked by default", () => {
    render(<FieldConfigModal {...defaultProps} />);
    expect(
      screen.getByRole("checkbox", {
        name: "Use wide angle mode for more robust ray aiming",
      }),
    ).not.toBeChecked();
  });

  it("renders the absolute fields checkbox below the wide angle checkbox", () => {
    render(<FieldConfigModal {...defaultProps} />);
    expect(
      screen.getByRole("checkbox", { name: "Use absolute fields" }),
    ).toBeInTheDocument();
  });

  it("wide angle checkbox reflects initialIsWideAngle", () => {
    render(<FieldConfigModal {...defaultProps} initialIsWideAngle />);
    expect(
      screen.getByRole("checkbox", {
        name: "Use wide angle mode for more robust ray aiming",
      }),
    ).toBeChecked();
  });

  it("enables and preserves wide angle mode for an initial object height field", async () => {
    const onApply = jest.fn();
    render(
      <FieldConfigModal
        {...defaultProps}
        initialType="height"
        initialIsWideAngle
        onApply={onApply}
      />,
    );
    const checkbox = screen.getByRole("checkbox", {
      name: "Use wide angle mode for more robust ray aiming",
    });

    expect(checkbox).toBeEnabled();
    expect(checkbox).toBeChecked();
    await userEvent.click(screen.getByText("Apply"));
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        space: "object",
        type: "height",
        isWideAngle: true,
      }),
    );
  });

  it("preserves checked wide angle mode when Object Height is selected", async () => {
    const onApply = jest.fn();
    render(
      <FieldConfigModal
        {...defaultProps}
        initialIsWideAngle
        onApply={onApply}
      />,
    );

    await userEvent.selectOptions(
      screen.getByLabelText("Field type"),
      "height",
    );
    const checkbox = screen.getByRole("checkbox", {
      name: "Use wide angle mode for more robust ray aiming",
    });
    expect(checkbox).toBeEnabled();
    expect(checkbox).toBeChecked();

    await userEvent.click(screen.getByText("Apply"));
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        space: "object",
        type: "height",
        isWideAngle: true,
      }),
    );
  });

  it("hides add buttons when at 10 rows", () => {
    const tenFields = Array.from({ length: 10 }, (_, i) => i * 0.1);
    render(<FieldConfigModal {...defaultProps} initialFields={tenFields} />);
    const addBtns = screen.getAllByLabelText("Add field row");
    addBtns.forEach((btn) => {
      expect(btn).toHaveStyle({ visibility: "hidden" });
    });
  });

  it("shows add buttons after deleting a row from 10", async () => {
    const tenFields = Array.from({ length: 10 }, (_, i) => i * 0.1);
    render(<FieldConfigModal {...defaultProps} initialFields={tenFields} />);
    const deleteBtns = screen.getAllByLabelText("Delete field row");
    await userEvent.click(deleteBtns[0]);

    const addBtns = screen.getAllByLabelText("Add field row");
    addBtns.forEach((btn) => {
      expect(btn).toHaveStyle({ visibility: "visible" });
    });
  });

  it("calls onApply with current wide angle state", async () => {
    const onApply = jest.fn();
    render(<FieldConfigModal {...defaultProps} onApply={onApply} />);

    await userEvent.click(
      screen.getByRole("checkbox", {
        name: "Use wide angle mode for more robust ray aiming",
      }),
    );
    await userEvent.click(screen.getByText("Apply"));

    expect(onApply).toHaveBeenCalledWith({
      space: "object",
      type: "angle",
      maxField: 20,
      fields: [0, 0.7, 1],
      isRelative: true,
      isWideAngle: true,
    });
  });

  it("applies absolute fields without a maxField property", async () => {
    const onApply = jest.fn();
    render(
      <FieldConfigModal
        {...defaultProps}
        initialFields={[-10, 0, 4]}
        initialIsRelative={false}
        onApply={onApply}
      />,
    );

    await userEvent.click(screen.getByText("Apply"));

    expect(onApply).toHaveBeenCalledWith({
      space: "object",
      type: "angle",
      fields: [-10, 0, 4],
      isRelative: false,
      isWideAngle: false,
    });
  });

  it("reinitializes the field mode from props when the modal reopens", async () => {
    const { rerender } = render(<FieldConfigModal {...defaultProps} />);
    await userEvent.click(
      screen.getByRole("checkbox", { name: "Use absolute fields" }),
    );

    rerender(<FieldConfigModal {...defaultProps} isOpen={false} />);
    rerender(
      <FieldConfigModal
        {...defaultProps}
        initialFields={[-2, 0, 4]}
        initialIsRelative={false}
      />,
    );

    expect(
      screen.getByRole("checkbox", { name: "Use absolute fields" }),
    ).toBeChecked();
    expect(getGridValueInputs().map((input) => input.value)).toEqual([
      "-2",
      "0",
      "4",
    ]);
  });

  it("resets wide angle checkbox from props when modal reopens", async () => {
    const { rerender } = render(<FieldConfigModal {...defaultProps} />);
    const checkbox = screen.getByRole("checkbox", {
      name: "Use wide angle mode for more robust ray aiming",
    });

    await userEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    rerender(
      <FieldConfigModal
        {...defaultProps}
        isOpen={false}
        initialIsWideAngle={false}
      />,
    );
    rerender(
      <FieldConfigModal {...defaultProps} isOpen initialIsWideAngle={false} />,
    );

    expect(
      screen.getByRole("checkbox", {
        name: "Use wide angle mode for more robust ray aiming",
      }),
    ).not.toBeChecked();
  });

  it("sets initial dropdown values from props", () => {
    render(
      <FieldConfigModal
        {...defaultProps}
        initialSpace="image"
        initialType="height"
      />,
    );
    const spaceDropdown = screen.getByLabelText(
      "Field space",
    ) as HTMLSelectElement;
    const typeDropdown = screen.getByLabelText(
      "Field type",
    ) as HTMLSelectElement;
    expect(spaceDropdown.value).toBe("image");
    expect(typeDropdown.value).toBe("height");
  });

  it("keeps the current draft while open when parent props change", async () => {
    const { rerender } = render(<FieldConfigModal {...defaultProps} />);
    const input = screen.getByLabelText("Max half-field value");

    await userEvent.clear(input);
    await userEvent.type(input, "45");
    expect(input).toHaveValue("45");

    rerender(
      <FieldConfigModal
        {...defaultProps}
        initialMaxField={30}
        initialFields={[0, 0.5, 1]}
      />,
    );

    expect(screen.getByLabelText("Max half-field value")).toHaveValue("45");
  });

  it("keeps an object angle field when the object space is selected again", async () => {
    render(<FieldConfigModal {...defaultProps} />);

    fireEvent.change(screen.getByLabelText("Field space"), {
      target: { value: "object" },
    });

    expect(screen.getByLabelText("Field type")).toHaveValue("angle");
  });

  it("inserts a zero-valued row immediately after the clicked row", async () => {
    const onApply = jest.fn();
    render(
      <FieldConfigModal
        {...defaultProps}
        initialFields={[0.1, 0.2]}
        onApply={onApply}
      />,
    );

    await userEvent.click(screen.getAllByLabelText("Add field row")[0]);
    await userEvent.click(screen.getByText("Apply"));

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ fields: [0.1, 0, 0.2], isRelative: true }),
    );
  });

  it("appends a zero-valued row after the last clicked field", async () => {
    const onApply = jest.fn();
    render(<FieldConfigModal {...defaultProps} onApply={onApply} />);

    await userEvent.click(screen.getAllByLabelText("Add field row")[2]);
    await userEvent.click(screen.getByText("Apply"));

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ fields: [0, 0.7, 1, 0], isRelative: true }),
    );
  });

  it("falls back to zero for a non-numeric maximum field value", async () => {
    const onApply = jest.fn();
    render(<FieldConfigModal {...defaultProps} onApply={onApply} />);

    const input = screen.getByLabelText("Max half-field value");
    await userEvent.clear(input);
    await userEvent.type(input, "not-a-number");
    await userEvent.click(screen.getByText("Apply"));

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ maxField: 0 }),
    );
  });

  it.each([
    ["below", "-1.01"],
    ["above", "1.01"],
  ])(
    "rejects a relative field value %s the inclusive bounds",
    async (_position, value) => {
      const user = userEvent.setup();
      const onApply = jest.fn();
      render(<FieldConfigModal {...defaultProps} onApply={onApply} />);

      const input = getGridValueInputs()[1];
      await user.clear(input);
      await user.type(input, value);
      await user.tab();

      expect(
        screen.getByText("Relative field values must be between -1 and 1."),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
      expect(onApply).not.toHaveBeenCalled();
    },
  );

  it("allows the inclusive relative field endpoints", async () => {
    const onApply = jest.fn();
    render(
      <FieldConfigModal
        {...defaultProps}
        initialFields={[-1, 1]}
        onApply={onApply}
      />,
    );

    expect(
      screen.queryByText("Relative field values must be between -1 and 1."),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply" })).toBeEnabled();
    await userEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ fields: [-1, 1], isRelative: true }),
    );
  });

  it("validates a pending grid edit before allowing Apply", async () => {
    const user = userEvent.setup();
    const onApply = jest.fn();
    render(<FieldConfigModal {...defaultProps} onApply={onApply} />);

    const input = getGridValueInputs()[1];
    await user.clear(input);
    await user.type(input, "1.01");
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(
      screen.getByText("Relative field values must be between -1 and 1."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
    expect(onApply).not.toHaveBeenCalled();
  });

  it("re-enables Apply after an invalid relative value is corrected", async () => {
    const user = userEvent.setup();
    render(<FieldConfigModal {...defaultProps} />);

    const input = getGridValueInputs()[1];
    await user.clear(input);
    await user.type(input, "1.01");
    await user.tab();
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();

    const correctedInput = getGridValueInputs()[1];
    await user.clear(correctedInput);
    await user.type(correctedInput, "0.5");
    await user.tab();

    expect(
      screen.queryByText("Relative field values must be between -1 and 1."),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply" })).toBeEnabled();
  });

  it("clears relative-range validation when absolute mode is selected", async () => {
    const user = userEvent.setup();
    const onApply = jest.fn();
    render(
      <FieldConfigModal
        {...defaultProps}
        initialFields={[0, 2]}
        onApply={onApply}
      />,
    );

    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
    await user.click(
      screen.getByRole("checkbox", { name: "Use absolute fields" }),
    );

    expect(
      screen.queryByText("Relative field values must be between -1 and 1."),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ fields: [0, 2], isRelative: false }),
    );
  });
});
