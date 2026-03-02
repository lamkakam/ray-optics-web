import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MediumSelectorModal } from "@/components/composite/MediumSelectorModal";

describe("MediumSelectorModal", () => {
  const defaultProps = {
    isOpen: true,
    initialMedium: "air",
    initialManufacturer: "air",
    onConfirm: jest.fn(),
    onClose: jest.fn(),
    onFetchGlassList: jest.fn().mockResolvedValue(["N-BK7", "N-SF6", "N-SK16"]),
  };

  it("does not render when isOpen is false", () => {
    render(<MediumSelectorModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders a dialog when isOpen is true", () => {
    render(<MediumSelectorModal {...defaultProps} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("has a manufacturer dropdown with Special and real manufacturers", () => {
    render(<MediumSelectorModal {...defaultProps} />);
    const select = screen.getByLabelText("Manufacturer");
    expect(select).toBeInTheDocument();

    const options = Array.from(
      (select as HTMLSelectElement).options
    ).map((o) => o.value);
    expect(options).toContain("Special");
    expect(options).toContain("Schott");
    expect(options).toContain("Hoya");
    expect(options).toContain("Ohara");
    expect(options).toContain("CDGM");
    expect(options).toContain("Hikari");
    expect(options).toContain("Sumita");
  });

  it("shows special options (air, REFL) when Special manufacturer selected", async () => {
    render(
      <MediumSelectorModal
        {...defaultProps}
        initialManufacturer="air"
        initialMedium="air"
      />
    );

    // Should default to Special since manufacturer is "air"
    expect(screen.getByLabelText("Medium")).toBeInTheDocument();
    const mediumSelect = screen.getByLabelText("Medium");
    const options = Array.from(
      (mediumSelect as HTMLSelectElement).options
    ).map((o) => o.value);
    expect(options).toContain("air");
    expect(options).toContain("REFL");
  });

  it("fetches glass list when a real manufacturer is selected", async () => {
    const onFetchGlassList = jest
      .fn()
      .mockResolvedValue(["N-BK7", "N-SF6"]);
    render(
      <MediumSelectorModal
        {...defaultProps}
        onFetchGlassList={onFetchGlassList}
      />
    );

    await userEvent.selectOptions(screen.getByLabelText("Manufacturer"), "Schott");
    expect(onFetchGlassList).toHaveBeenCalledWith("Schott");
  });

  it("calls onConfirm with selected medium and manufacturer", async () => {
    const onConfirm = jest.fn();
    render(
      <MediumSelectorModal
        {...defaultProps}
        onConfirm={onConfirm}
      />
    );

    // Select Special → air
    await userEvent.selectOptions(screen.getByLabelText("Medium"), "REFL");
    await userEvent.click(screen.getByText("Confirm"));

    expect(onConfirm).toHaveBeenCalledWith("REFL", "air");
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
