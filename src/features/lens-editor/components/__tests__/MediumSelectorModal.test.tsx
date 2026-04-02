import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MediumSelectorModal } from "@/features/lens-editor/components/MediumSelectorModal";

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

  it("does not call onClose when clicking the backdrop overlay", async () => {
    const onClose = jest.fn();
    render(<MediumSelectorModal {...defaultProps} onClose={onClose} />);
    const backdrop = screen.getByTestId("modal-backdrop");

    await userEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(0);
  });

  it("has a manufacturer dropdown with Special and manufacturers from JSON", () => {
    render(<MediumSelectorModal {...defaultProps} />);
    const select = screen.getByLabelText("Manufacturer");
    expect(select).toBeInTheDocument();
    expect(screen.getByLabelText("Use model glass")).not.toBeChecked();

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

  it("replaces dropdowns with model-glass controls when Use model glass is checked", async () => {
    render(<MediumSelectorModal {...defaultProps} />);

    await userEvent.click(screen.getByLabelText("Use model glass"));

    expect(screen.queryByLabelText("Manufacturer")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Glass")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Single refractive index")).not.toBeChecked();
    expect(screen.getByLabelText("Refractive index at d-line")).toBeInTheDocument();
    expect(screen.getByLabelText("Abbe Number")).toBeInTheDocument();
  });

  it("clears and hides Abbe Number when Single refractive index is checked", async () => {
    render(<MediumSelectorModal {...defaultProps} />);

    await userEvent.click(screen.getByLabelText("Use model glass"));
    await userEvent.type(screen.getByLabelText("Abbe Number"), "64.1");
    await userEvent.click(screen.getByLabelText("Single refractive index"));

    expect(screen.getByLabelText("Single refractive index")).toBeChecked();
    expect(screen.queryByLabelText("Abbe Number")).not.toBeInTheDocument();
  });

  it("shows an empty Abbe Number input again when Single refractive index is unchecked", async () => {
    render(<MediumSelectorModal {...defaultProps} />);

    await userEvent.click(screen.getByLabelText("Use model glass"));
    await userEvent.type(screen.getByLabelText("Abbe Number"), "64.1");
    await userEvent.click(screen.getByLabelText("Single refractive index"));
    await userEvent.click(screen.getByLabelText("Single refractive index"));

    expect(screen.getByLabelText("Abbe Number")).toHaveValue("");
  });

  it("calls onConfirm with refractive index and Abbe number in model-glass mode", async () => {
    const onConfirm = jest.fn();
    render(<MediumSelectorModal {...defaultProps} onConfirm={onConfirm} />);

    await userEvent.click(screen.getByLabelText("Use model glass"));
    await userEvent.type(screen.getByLabelText("Refractive index at d-line"), "1.5168");
    await userEvent.type(screen.getByLabelText("Abbe Number"), "64.17");
    await userEvent.click(screen.getByText("Confirm"));

    expect(onConfirm).toHaveBeenCalledWith("1.5168", "64.17");
  });

  it("normalizes an invalid refractive index to 1.0 on blur", async () => {
    render(<MediumSelectorModal {...defaultProps} />);

    await userEvent.click(screen.getByLabelText("Use model glass"));
    const refractiveIndexInput = screen.getByLabelText("Refractive index at d-line");

    await userEvent.clear(refractiveIndexInput);
    await userEvent.type(refractiveIndexInput, "abc");
    await userEvent.tab();

    expect(refractiveIndexInput).toHaveValue("1.0");
  });

  it("normalizes a non-positive refractive index to 1.0 on blur", async () => {
    render(<MediumSelectorModal {...defaultProps} />);

    await userEvent.click(screen.getByLabelText("Use model glass"));
    const refractiveIndexInput = screen.getByLabelText("Refractive index at d-line");

    await userEvent.clear(refractiveIndexInput);
    await userEvent.type(refractiveIndexInput, "-2");
    await userEvent.tab();

    expect(refractiveIndexInput).toHaveValue("1.0");
  });

  it("preserves a valid positive refractive index on blur", async () => {
    render(<MediumSelectorModal {...defaultProps} />);

    await userEvent.click(screen.getByLabelText("Use model glass"));
    const refractiveIndexInput = screen.getByLabelText("Refractive index at d-line");

    await userEvent.clear(refractiveIndexInput);
    await userEvent.type(refractiveIndexInput, "1.5168");
    await userEvent.tab();

    expect(refractiveIndexInput).toHaveValue("1.5168");
  });

  it("normalizes an invalid Abbe number to an empty string on blur", async () => {
    render(<MediumSelectorModal {...defaultProps} />);

    await userEvent.click(screen.getByLabelText("Use model glass"));
    const abbeNumberInput = screen.getByLabelText("Abbe Number");

    await userEvent.clear(abbeNumberInput);
    await userEvent.type(abbeNumberInput, "abc");
    await userEvent.tab();

    expect(abbeNumberInput).toHaveValue("");
  });

  it("preserves an empty Abbe number on blur", async () => {
    render(<MediumSelectorModal {...defaultProps} />);

    await userEvent.click(screen.getByLabelText("Use model glass"));
    const abbeNumberInput = screen.getByLabelText("Abbe Number");

    await userEvent.clear(abbeNumberInput);
    await userEvent.tab();

    expect(abbeNumberInput).toHaveValue("");
  });

  it("preserves a valid numeric Abbe number on blur", async () => {
    render(<MediumSelectorModal {...defaultProps} />);

    await userEvent.click(screen.getByLabelText("Use model glass"));
    const abbeNumberInput = screen.getByLabelText("Abbe Number");

    await userEvent.clear(abbeNumberInput);
    await userEvent.type(abbeNumberInput, "64.17");
    await userEvent.tab();

    expect(abbeNumberInput).toHaveValue("64.17");
  });

  it("calls onConfirm with empty manufacturer in single-index mode", async () => {
    const onConfirm = jest.fn();
    render(<MediumSelectorModal {...defaultProps} onConfirm={onConfirm} />);

    await userEvent.click(screen.getByLabelText("Use model glass"));
    await userEvent.type(screen.getByLabelText("Refractive index at d-line"), "1.458");
    await userEvent.type(screen.getByLabelText("Abbe Number"), "67.8");
    await userEvent.click(screen.getByLabelText("Single refractive index"));
    await userEvent.click(screen.getByText("Confirm"));

    expect(onConfirm).toHaveBeenCalledWith("1.458", "");
  });

  it("auto-detects numeric initial values as model glass", () => {
    render(
      <MediumSelectorModal
        {...defaultProps}
        initialMedium="1.62"
        initialManufacturer="36.3"
      />
    );

    expect(screen.getByLabelText("Use model glass")).toBeChecked();
    expect(screen.getByLabelText("Refractive index at d-line")).toHaveValue("1.62");
    expect(screen.getByLabelText("Abbe Number")).toHaveValue("36.3");
    expect(screen.getByLabelText("Single refractive index")).not.toBeChecked();
  });

  it("auto-enables single-index mode when initial manufacturer is not numeric", () => {
    render(
      <MediumSelectorModal
        {...defaultProps}
        initialMedium="1.62"
        initialManufacturer=""
      />
    );

    expect(screen.getByLabelText("Use model glass")).toBeChecked();
    expect(screen.getByLabelText("Single refractive index")).toBeChecked();
    expect(screen.getByLabelText("Refractive index at d-line")).toHaveValue("1.62");
    expect(screen.queryByLabelText("Abbe Number")).not.toBeInTheDocument();
  });

  it("calls onClose when Cancel is clicked", async () => {
    const onClose = jest.fn();
    render(<MediumSelectorModal {...defaultProps} onClose={onClose} />);

    await userEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose when Escape is pressed", async () => {
    const onClose = jest.fn();
    render(<MediumSelectorModal {...defaultProps} onClose={onClose} />);

    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(0);
  });
});
