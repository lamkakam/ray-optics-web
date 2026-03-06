import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SpecsConfigurerContainer } from "@/components/container/SpecsConfigurerContainer";
import type { OpticalSpecs } from "@/lib/opticalModel";

// Mock useTheme — default to light
jest.mock("@/components/ThemeProvider", () => ({
  useTheme: () => ({ theme: "light", toggleTheme: jest.fn() }),
}));

const testSpecs: OpticalSpecs = {
  pupil: { space: "object", type: "epd", value: 25 },
  field: {
    space: "object",
    type: "angle",
    maxField: 20,
    fields: [0, 0.7, 1],
    isRelative: true,
  },
  wavelengths: {
    weights: [
      [486.133, 1],
      [587.562, 1],
      [656.273, 1],
    ],
    referenceIndex: 1,
  },
};

describe("SpecsConfigurerContainer", () => {
  const defaultProps = {
    initialSpecs: testSpecs,
    onSpecsChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the panel with System Aperture section", () => {
    render(<SpecsConfigurerContainer {...defaultProps} />);
    expect(screen.getByText("System Aperture")).toBeInTheDocument();
  });

  it("renders the panel with Field section", () => {
    render(<SpecsConfigurerContainer {...defaultProps} />);
    expect(screen.getByText("Field")).toBeInTheDocument();
  });

  it("renders the panel with Wavelengths section", () => {
    render(<SpecsConfigurerContainer {...defaultProps} />);
    expect(screen.getByText("Wavelengths")).toBeInTheDocument();
  });

  it("initializes aperture dropdown from initialSpecs", () => {
    render(<SpecsConfigurerContainer {...defaultProps} />);
    const dropdown = screen.getByLabelText("System aperture type") as HTMLSelectElement;
    expect(dropdown.value).toBe("object:epd");
  });

  it("initializes aperture value from initialSpecs", () => {
    render(<SpecsConfigurerContainer {...defaultProps} />);
    const input = screen.getByLabelText("Aperture value") as HTMLInputElement;
    expect(input.value).toBe("25");
  });

  it("calls onSpecsChange when aperture dropdown changes", async () => {
    const onSpecsChange = jest.fn();
    render(<SpecsConfigurerContainer {...defaultProps} onSpecsChange={onSpecsChange} />);
    const dropdown = screen.getByLabelText("System aperture type");

    await userEvent.selectOptions(dropdown, "image:f/#");
    expect(onSpecsChange).toHaveBeenCalledWith(
      expect.objectContaining({
        pupil: expect.objectContaining({ space: "image", type: "f/#" }),
      })
    );
  });

  it("opens field modal when field button is clicked", async () => {
    render(<SpecsConfigurerContainer {...defaultProps} />);
    const btn = screen.getByRole("button", { name: /field/i });

    await userEvent.click(btn);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes field modal when Cancel is clicked", async () => {
    render(<SpecsConfigurerContainer {...defaultProps} />);
    const btn = screen.getByRole("button", { name: /field/i });
    await userEvent.click(btn);

    await userEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("calls onSpecsChange when field modal Apply is clicked", async () => {
    const onSpecsChange = jest.fn();
    render(<SpecsConfigurerContainer {...defaultProps} onSpecsChange={onSpecsChange} />);
    const btn = screen.getByRole("button", { name: /field/i });
    await userEvent.click(btn);

    await userEvent.click(screen.getByText("Apply"));
    expect(onSpecsChange).toHaveBeenCalledWith(
      expect.objectContaining({
        field: expect.objectContaining({
          fields: [0, 0.7, 1],
          maxField: 20,
        }),
      })
    );
  });

  it("opens wavelength modal when wavelength button is clicked", async () => {
    render(<SpecsConfigurerContainer {...defaultProps} />);
    const btn = screen.getByRole("button", { name: /wavelength/i });

    await userEvent.click(btn);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("calls onSpecsChange when wavelength modal Apply is clicked", async () => {
    const onSpecsChange = jest.fn();
    render(<SpecsConfigurerContainer {...defaultProps} onSpecsChange={onSpecsChange} />);
    const btn = screen.getByRole("button", { name: /wavelength/i });
    await userEvent.click(btn);

    await userEvent.click(screen.getByText("Apply"));
    expect(onSpecsChange).toHaveBeenCalledWith(
      expect.objectContaining({
        wavelengths: expect.objectContaining({
          weights: [
            [486.133, 1],
            [587.562, 1],
            [656.273, 1],
          ],
          referenceIndex: 1,
        }),
      })
    );
  });
});
