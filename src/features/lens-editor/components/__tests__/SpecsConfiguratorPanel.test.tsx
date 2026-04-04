import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SpecsConfiguratorPanel } from "@/features/lens-editor/components/SpecsConfiguratorPanel";

const defaultProps = {
  pupilSpace: "object" as const,
  pupilType: "epd" as const,
  pupilValue: 25,
  fieldSummary: "3 fields, 20° max",
  wavelengthSummary: "3 wavelengths",
  onApertureChange: jest.fn(),
  onOpenFieldModal: jest.fn(),
  onOpenWavelengthModal: jest.fn(),
};

describe("SpecsConfiguratorPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("constrains the panel to half the viewport width", () => {
      const { container } = render(<SpecsConfiguratorPanel {...defaultProps} />);
      const root = container.firstElementChild;
      expect(root).toHaveClass("max-w-[50vw]");
    });

    it("renders System Aperture label", () => {
      render(<SpecsConfiguratorPanel {...defaultProps} />);
      expect(screen.getByText("System Aperture")).toBeInTheDocument();
    });

    it("renders aperture dropdown with 3 options", () => {
      render(<SpecsConfiguratorPanel {...defaultProps} />);
      const dropdown = screen.getByLabelText("System aperture type");
      expect(dropdown).toBeInTheDocument();
      expect(dropdown.querySelectorAll("option")).toHaveLength(3);
    });

    it("renders aperture value textbox", () => {
      render(<SpecsConfiguratorPanel {...defaultProps} />);
      const input = screen.getByLabelText("Aperture value");
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue("25");
    });

    it("renders Field label and button with summary", () => {
      render(<SpecsConfiguratorPanel {...defaultProps} />);
      expect(screen.getByText("Field")).toBeInTheDocument();
      const btn = screen.getByRole("button", { name: /field/i });
      expect(btn).toHaveTextContent("3 fields, 20° max");
    });

    it("renders Wavelengths label and button with summary", () => {
      render(<SpecsConfiguratorPanel {...defaultProps} />);
      expect(screen.getByText("Wavelengths")).toBeInTheDocument();
      const btn = screen.getByRole("button", { name: /wavelength/i });
      expect(btn).toHaveTextContent("3 wavelengths");
    });

    it("selects correct dropdown option for Entrance Pupil Diameter", () => {
      render(<SpecsConfiguratorPanel {...defaultProps} pupilSpace="object" pupilType="epd" />);
      const dropdown = screen.getByLabelText("System aperture type") as HTMLSelectElement;
      expect(dropdown.value).toBe("object:epd");
    });

    it("selects correct dropdown option for Image Space F/#", () => {
      render(<SpecsConfiguratorPanel {...defaultProps} pupilSpace="image" pupilType="f/#" />);
      const dropdown = screen.getByLabelText("System aperture type") as HTMLSelectElement;
      expect(dropdown.value).toBe("image:f/#");
    });

    it("selects correct dropdown option for Object Space NA", () => {
      render(<SpecsConfiguratorPanel {...defaultProps} pupilSpace="object" pupilType="NA" />);
      const dropdown = screen.getByLabelText("System aperture type") as HTMLSelectElement;
      expect(dropdown.value).toBe("object:NA");
    });
  });

  describe("interactions", () => {
    it("calls onApertureChange with correct value when dropdown changes to Image Space F/#", async () => {
      const onApertureChange = jest.fn();
      render(<SpecsConfiguratorPanel {...defaultProps} onApertureChange={onApertureChange} />);
      const dropdown = screen.getByLabelText("System aperture type");

      await userEvent.selectOptions(dropdown, "image:f/#");
      expect(onApertureChange).toHaveBeenCalledWith({
        pupilSpace: "image",
        pupilType: "f/#",
      });
    });

    it("calls onApertureChange with correct value when dropdown changes to Object Space NA", async () => {
      const onApertureChange = jest.fn();
      render(<SpecsConfiguratorPanel {...defaultProps} onApertureChange={onApertureChange} />);
      const dropdown = screen.getByLabelText("System aperture type");

      await userEvent.selectOptions(dropdown, "object:NA");
      expect(onApertureChange).toHaveBeenCalledWith({
        pupilSpace: "object",
        pupilType: "NA",
      });
    });

    it("calls onApertureChange with pupilValue on textbox blur", async () => {
      const onApertureChange = jest.fn();
      render(<SpecsConfiguratorPanel {...defaultProps} onApertureChange={onApertureChange} />);
      const input = screen.getByLabelText("Aperture value");

      await userEvent.clear(input);
      await userEvent.type(input, "50");
      await userEvent.tab(); // trigger blur
      expect(onApertureChange).toHaveBeenCalledWith({ pupilValue: 50 });
    });

    it("does not call onApertureChange for non-numeric textbox input", async () => {
      const onApertureChange = jest.fn();
      render(<SpecsConfiguratorPanel {...defaultProps} onApertureChange={onApertureChange} />);
      const input = screen.getByLabelText("Aperture value");

      await userEvent.clear(input);
      await userEvent.type(input, "abc");
      await userEvent.tab();
      expect(onApertureChange).not.toHaveBeenCalledWith(
        expect.objectContaining({ pupilValue: expect.anything() })
      );
    });

    it("reverts to previous valid value when invalid input is entered on blur", async () => {
      render(<SpecsConfiguratorPanel {...defaultProps} pupilValue={25.15} />);
      const input = screen.getByLabelText("Aperture value");

      expect(input).toHaveValue("25.15");
      await userEvent.clear(input);
      await userEvent.type(input, "25.15aaa");
      await userEvent.tab();
      expect(input).toHaveValue("25.15");
    });

    it("resets the draft when the committed pupil value changes", async () => {
      const { rerender } = render(
        <SpecsConfiguratorPanel {...defaultProps} pupilValue={25} />
      );
      const input = screen.getByLabelText("Aperture value");

      await userEvent.clear(input);
      await userEvent.type(input, "33");
      expect(input).toHaveValue("33");

      rerender(<SpecsConfiguratorPanel {...defaultProps} pupilValue={40} />);

      expect(screen.getByLabelText("Aperture value")).toHaveValue("40");
    });

    it("calls onOpenFieldModal when field button is clicked", async () => {
      const onOpenFieldModal = jest.fn();
      render(<SpecsConfiguratorPanel {...defaultProps} onOpenFieldModal={onOpenFieldModal} />);
      const btn = screen.getByRole("button", { name: /field/i });

      await userEvent.click(btn);
      expect(onOpenFieldModal).toHaveBeenCalledTimes(1);
    });

    it("calls onOpenWavelengthModal when wavelength button is clicked", async () => {
      const onOpenWavelengthModal = jest.fn();
      render(<SpecsConfiguratorPanel {...defaultProps} onOpenWavelengthModal={onOpenWavelengthModal} />);
      const btn = screen.getByRole("button", { name: /wavelength/i });

      await userEvent.click(btn);
      expect(onOpenWavelengthModal).toHaveBeenCalledTimes(1);
    });
  });
});
