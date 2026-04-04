import React from "react";
import { render, screen, within } from "@testing-library/react";
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
  initialRelativeFields: [0, 0.7, 1],
  initialIsWideAngle: false,
  onApply: jest.fn(),
  onClose: jest.fn(),
};

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

  it("renders Field title", () => {
    render(<FieldConfigModal {...defaultProps} />);
    expect(screen.getByText("Field")).toBeInTheDocument();
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

  it("renders max field textbox with initial value", () => {
    render(<FieldConfigModal {...defaultProps} />);
    const input = screen.getByLabelText("Max field value");
    expect(input).toHaveValue("20");
  });

  it("renders ag-grid with initial relative fields", () => {
    render(<FieldConfigModal {...defaultProps} />);
    const grid = screen.getByTestId("ag-grid-mock");
    expect(grid).toBeInTheDocument();
    // 3 rows for [0, 0.7, 1]
    const rows = within(grid).getAllByRole("row");
    // header row + 3 data rows
    expect(rows).toHaveLength(4);
  });

  it("renders add row button for each row", () => {
    render(<FieldConfigModal {...defaultProps} />);
    const addBtns = screen.getAllByLabelText("Add field row");
    expect(addBtns).toHaveLength(3);
  });

  it("does not render delete button for first row", () => {
    render(<FieldConfigModal {...defaultProps} initialRelativeFields={[0]} />);
    expect(screen.queryByLabelText("Delete field row")).not.toBeInTheDocument();
  });

  it("renders delete button for non-first rows", () => {
    render(<FieldConfigModal {...defaultProps} />);
    const deleteBtns = screen.getAllByLabelText("Delete field row");
    // rows 2 and 3 have delete buttons (not the first)
    expect(deleteBtns).toHaveLength(2);
  });

  it("adds a row when add button is clicked (up to 10)", async () => {
    render(<FieldConfigModal {...defaultProps} initialRelativeFields={[0]} />);
    const addBtn = screen.getByLabelText("Add field row");
    await userEvent.click(addBtn);

    const grid = screen.getByTestId("ag-grid-mock");
    const rows = within(grid).getAllByRole("row");
    // header + 2 data rows
    expect(rows).toHaveLength(3);
  });

  it("does not add more than 10 rows", async () => {
    const tenFields = Array.from({ length: 10 }, (_, i) => i * 0.1);
    render(<FieldConfigModal {...defaultProps} initialRelativeFields={tenFields} />);
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
      relativeFields: [0, 0.7, 1],
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
      })
    ).toBeInTheDocument();
  });

  it("wide angle checkbox is unchecked by default", () => {
    render(<FieldConfigModal {...defaultProps} />);
    expect(
      screen.getByRole("checkbox", {
        name: "Use wide angle mode for more robust ray aiming",
      })
    ).not.toBeChecked();
  });

  it("wide angle checkbox reflects initialIsWideAngle", () => {
    render(<FieldConfigModal {...defaultProps} initialIsWideAngle />);
    expect(
      screen.getByRole("checkbox", {
        name: "Use wide angle mode for more robust ray aiming",
      })
    ).toBeChecked();
  });

  it("renders a compact checkbox with a left-aligned label", () => {
    render(<FieldConfigModal {...defaultProps} />);

    const checkbox = screen.getByRole("checkbox", {
      name: "Use wide angle mode for more robust ray aiming",
    });
    const label = screen.getByText("Use wide angle mode for more robust ray aiming");

    expect(checkbox).toHaveClass("w-4");
    expect(checkbox).toHaveClass("shrink-0");
    expect(checkbox).not.toHaveClass("w-full");
    expect(label).toHaveClass("text-left");
  });

  it("hides add buttons when at 10 rows", () => {
    const tenFields = Array.from({ length: 10 }, (_, i) => i * 0.1);
    render(<FieldConfigModal {...defaultProps} initialRelativeFields={tenFields} />);
    const addBtns = screen.getAllByLabelText("Add field row");
    addBtns.forEach((btn) => {
      expect(btn).toHaveStyle({ visibility: "hidden" });
    });
  });

  it("shows add buttons after deleting a row from 10", async () => {
    const tenFields = Array.from({ length: 10 }, (_, i) => i * 0.1);
    render(<FieldConfigModal {...defaultProps} initialRelativeFields={tenFields} />);
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
      })
    );
    await userEvent.click(screen.getByText("Apply"));

    expect(onApply).toHaveBeenCalledWith({
      space: "object",
      type: "angle",
      maxField: 20,
      relativeFields: [0, 0.7, 1],
      isWideAngle: true,
    });
  });

  it("resets wide angle checkbox from props when modal reopens", async () => {
    const { rerender } = render(<FieldConfigModal {...defaultProps} />);
    const checkbox = screen.getByRole("checkbox", {
      name: "Use wide angle mode for more robust ray aiming",
    });

    await userEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    rerender(<FieldConfigModal {...defaultProps} isOpen={false} initialIsWideAngle={false} />);
    rerender(<FieldConfigModal {...defaultProps} isOpen initialIsWideAngle={false} />);

    expect(
      screen.getByRole("checkbox", {
        name: "Use wide angle mode for more robust ray aiming",
      })
    ).not.toBeChecked();
  });

  it("sets initial dropdown values from props", () => {
    render(<FieldConfigModal {...defaultProps} initialSpace="image" initialType="height" />);
    const spaceDropdown = screen.getByLabelText("Field space") as HTMLSelectElement;
    const typeDropdown = screen.getByLabelText("Field type") as HTMLSelectElement;
    expect(spaceDropdown.value).toBe("image");
    expect(typeDropdown.value).toBe("height");
  });

  it("keeps the current draft while open when parent props change", async () => {
    const { rerender } = render(<FieldConfigModal {...defaultProps} />);
    const input = screen.getByLabelText("Max field value");

    await userEvent.clear(input);
    await userEvent.type(input, "45");
    expect(input).toHaveValue("45");

    rerender(
      <FieldConfigModal
        {...defaultProps}
        initialMaxField={30}
        initialRelativeFields={[0, 0.5, 1]}
      />
    );

    expect(screen.getByLabelText("Max field value")).toHaveValue("45");
  });
});
