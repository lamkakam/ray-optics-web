import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WavelengthConfigModal } from "@/components/composite/WavelengthConfigModal";

const defaultProps = {
  isOpen: true,
  initialWeights: [
    [486.133, 1],
    [587.562, 1],
    [656.273, 1],
  ] as [number, number][],
  initialReferenceIndex: 1,
  onApply: jest.fn(),
  onClose: jest.fn(),
};

describe("WavelengthConfigModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does not render when isOpen is false", () => {
    render(<WavelengthConfigModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders a dialog when isOpen is true", () => {
    render(<WavelengthConfigModal {...defaultProps} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("renders Wavelengths title", () => {
    render(<WavelengthConfigModal {...defaultProps} />);
    expect(screen.getByText("Wavelengths")).toBeInTheDocument();
  });

  it("renders ag-grid with initial wavelength rows", () => {
    render(<WavelengthConfigModal {...defaultProps} />);
    const grid = screen.getByTestId("ag-grid-mock");
    const rows = within(grid).getAllByRole("row");
    // header + 3 data rows
    expect(rows).toHaveLength(4);
  });

  it("renders add row button for each row", () => {
    render(<WavelengthConfigModal {...defaultProps} />);
    const addBtns = screen.getAllByLabelText("Add wavelength row");
    expect(addBtns).toHaveLength(3);
  });

  it("does not render delete button for first row", () => {
    render(
      <WavelengthConfigModal
        {...defaultProps}
        initialWeights={[[546.073, 1]]}
        initialReferenceIndex={0}
      />
    );
    expect(screen.queryByLabelText("Delete wavelength row")).not.toBeInTheDocument();
  });

  it("renders delete button for non-first rows", () => {
    render(<WavelengthConfigModal {...defaultProps} />);
    const deleteBtns = screen.getAllByLabelText("Delete wavelength row");
    expect(deleteBtns).toHaveLength(2);
  });

  it("adds a row when add button is clicked", async () => {
    render(
      <WavelengthConfigModal
        {...defaultProps}
        initialWeights={[[546.073, 1]]}
        initialReferenceIndex={0}
      />
    );
    const addBtn = screen.getByLabelText("Add wavelength row");
    await userEvent.click(addBtn);

    const grid = screen.getByTestId("ag-grid-mock");
    const rows = within(grid).getAllByRole("row");
    expect(rows).toHaveLength(3); // header + 2 data rows
  });

  it("does not add more than 10 rows", async () => {
    const tenWeights: [number, number][] = Array.from({ length: 10 }, () => [546.073, 1]);
    render(
      <WavelengthConfigModal
        {...defaultProps}
        initialWeights={tenWeights}
        initialReferenceIndex={0}
      />
    );
    const addBtns = screen.getAllByLabelText("Add wavelength row");
    await userEvent.click(addBtns[0]);

    const grid = screen.getByTestId("ag-grid-mock");
    const rows = within(grid).getAllByRole("row");
    expect(rows).toHaveLength(11); // header + 10 (unchanged)
  });

  it("deletes a row when delete button is clicked", async () => {
    render(<WavelengthConfigModal {...defaultProps} />);
    const deleteBtns = screen.getAllByLabelText("Delete wavelength row");
    await userEvent.click(deleteBtns[0]);

    const grid = screen.getByTestId("ag-grid-mock");
    const rows = within(grid).getAllByRole("row");
    expect(rows).toHaveLength(3); // header + 2
  });

  it("renders radio buttons for reference wavelength", () => {
    render(<WavelengthConfigModal {...defaultProps} />);
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(3);
  });

  it("selects the correct initial reference wavelength", () => {
    render(<WavelengthConfigModal {...defaultProps} />);
    const radios = screen.getAllByRole("radio") as HTMLInputElement[];
    expect(radios[0].checked).toBe(false);
    expect(radios[1].checked).toBe(true);
    expect(radios[2].checked).toBe(false);
  });

  it("changes reference wavelength when a different radio is clicked", async () => {
    render(<WavelengthConfigModal {...defaultProps} />);
    const radios = screen.getAllByRole("radio") as HTMLInputElement[];
    await userEvent.click(radios[2]);
    expect(radios[2].checked).toBe(true);
    expect(radios[1].checked).toBe(false);
  });

  it("calls onApply with current draft state when Apply is clicked", async () => {
    const onApply = jest.fn();
    render(<WavelengthConfigModal {...defaultProps} onApply={onApply} />);

    await userEvent.click(screen.getByText("Apply"));
    expect(onApply).toHaveBeenCalledWith({
      weights: [
        [486.133, 1],
        [587.562, 1],
        [656.273, 1],
      ],
      referenceIndex: 1,
    });
  });

  it("calls onClose when Cancel is clicked", async () => {
    const onClose = jest.fn();
    render(<WavelengthConfigModal {...defaultProps} onClose={onClose} />);

    await userEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onApply when Cancel is clicked", async () => {
    const onApply = jest.fn();
    render(<WavelengthConfigModal {...defaultProps} onApply={onApply} />);

    await userEvent.click(screen.getByText("Cancel"));
    expect(onApply).not.toHaveBeenCalled();
  });

  it("does not call onClose when Escape is pressed", async () => {
    const onClose = jest.fn();
    render(<WavelengthConfigModal {...defaultProps} onClose={onClose} />);

    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(0);
  });

  it("does not call onClose when backdrop is clicked", async () => {
    const onClose = jest.fn();
    render(<WavelengthConfigModal {...defaultProps} onClose={onClose} />);

    await userEvent.click(screen.getByTestId("modal-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(0);
  });

  it("adjusts referenceIndex when deleting a row before the reference", async () => {
    // Reference is index 1 (587.562), delete index 1 (second row)
    // After deletion: reference should point to what was index 2 (now index 1)
    const onApply = jest.fn();
    render(
      <WavelengthConfigModal
        {...defaultProps}
        initialReferenceIndex={2}
        onApply={onApply}
      />
    );
    // Delete second row (index 1)
    const deleteBtns = screen.getAllByLabelText("Delete wavelength row");
    await userEvent.click(deleteBtns[0]); // first delete button is for row index 1

    await userEvent.click(screen.getByText("Apply"));
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ referenceIndex: 1 })
    );
  });
});
