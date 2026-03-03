import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MediumSelectorModal } from "@/components/composite/MediumSelectorModal";

jest.mock("@/data/glass-catalogs.json", () => ({
  Schott: ["N-BK7", "N-SF6"],
  Ohara: ["S-FPL51"],
}));

describe("MediumSelectorModal", () => {
  const defaultProps = {
    isOpen: true,
    initialMedium: "air",
    initialManufacturer: "",
    onConfirm: jest.fn(),
    onClose: jest.fn(),
  };

  it("does not render when isOpen is false", () => {
    render(<MediumSelectorModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders a dialog when isOpen is true", () => {
    render(<MediumSelectorModal {...defaultProps} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("renders a backdrop overlay behind the dialog", () => {
    render(<MediumSelectorModal {...defaultProps} />);
    const backdrop = screen.getByTestId("modal-backdrop");
    expect(backdrop).toBeInTheDocument();
  });

  it("calls onClose when clicking the backdrop overlay", async () => {
    const onClose = jest.fn();
    render(<MediumSelectorModal {...defaultProps} onClose={onClose} />);
    const backdrop = screen.getByTestId("modal-backdrop");

    await userEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("has a manufacturer dropdown with Special and manufacturers from JSON", () => {
    render(<MediumSelectorModal {...defaultProps} />);
    const select = screen.getByLabelText("Manufacturer");
    expect(select).toBeInTheDocument();

    const options = Array.from(
      (select as HTMLSelectElement).options
    ).map((o) => o.value);
    expect(options).toContain("Special");
    expect(options).toContain("Schott");
    expect(options).toContain("Ohara");
    expect(options).toHaveLength(3); // Special + 2 from mock
  });

  it("shows special options (air, REFL) when Special manufacturer selected", async () => {
    render(
      <MediumSelectorModal
        {...defaultProps}
        initialManufacturer=""
        initialMedium="air"
      />
    );

    expect(screen.getByLabelText("Glass")).toBeInTheDocument();
    const glassSelect = screen.getByLabelText("Glass");
    const options = Array.from(
      (glassSelect as HTMLSelectElement).options
    ).map((o) => o.value);
    expect(options).toContain("air");
    expect(options).toContain("REFL");
  });

  it("shows glass options synchronously when a real manufacturer is selected", async () => {
    render(<MediumSelectorModal {...defaultProps} />);

    await userEvent.selectOptions(screen.getByLabelText("Manufacturer"), "Schott");

    const glassSelect = screen.getByLabelText("Glass");
    const options = Array.from(
      (glassSelect as HTMLSelectElement).options
    ).map((o) => o.value);
    expect(options).toContain("N-BK7");
    expect(options).toContain("N-SF6");
  });

  it("calls onConfirm with selected medium and manufacturer", async () => {
    const onConfirm = jest.fn();
    render(
      <MediumSelectorModal
        {...defaultProps}
        onConfirm={onConfirm}
      />
    );

    await userEvent.selectOptions(screen.getByLabelText("Glass"), "REFL");
    await userEvent.click(screen.getByText("Confirm"));

    expect(onConfirm).toHaveBeenCalledWith("REFL", "");
  });

  it("calls onClose when Cancel is clicked", async () => {
    const onClose = jest.fn();
    render(<MediumSelectorModal {...defaultProps} onClose={onClose} />);

    await userEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Escape is pressed", async () => {
    const onClose = jest.fn();
    render(<MediumSelectorModal {...defaultProps} onClose={onClose} />);

    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
