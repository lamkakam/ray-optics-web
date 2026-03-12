import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AnalysisPlotView } from "@/components/composite/AnalysisPlotView";

describe("AnalysisPlotView", () => {
  const fieldOptions = [
    { label: "0.0°", value: 0 },
    { label: "14.0°", value: 1 },
    { label: "20.0°", value: 2 },
  ];

  const defaultProps = {
    fieldOptions,
    selectedFieldIndex: 0,
    selectedPlotType: "rayFan" as const,
    onFieldChange: jest.fn(),
    onPlotTypeChange: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it("renders field selector with correct options", () => {
    render(<AnalysisPlotView {...defaultProps} />);
    const select = screen.getByLabelText("Field");
    expect(select).toBeInTheDocument();
    expect(screen.getByText("0.0°")).toBeInTheDocument();
    expect(screen.getByText("14.0°")).toBeInTheDocument();
    expect(screen.getByText("20.0°")).toBeInTheDocument();
  });

  it("renders plot type selector with three options", () => {
    render(<AnalysisPlotView {...defaultProps} />);
    const select = screen.getByLabelText("Plot type");
    expect(select).toBeInTheDocument();
    expect(screen.getByText("Ray Fan")).toBeInTheDocument();
    expect(screen.getByText("OPD Fan")).toBeInTheDocument();
    expect(screen.getByText("Spot Diagram")).toBeInTheDocument();
  });

  it("calls onFieldChange when field is changed", async () => {
    const onFieldChange = jest.fn();
    render(<AnalysisPlotView {...defaultProps} onFieldChange={onFieldChange} />);
    const select = screen.getByLabelText("Field");
    await userEvent.selectOptions(select, "2");
    expect(onFieldChange).toHaveBeenCalledWith(2);
  });

  it("calls onPlotTypeChange when plot type is changed", async () => {
    const onPlotTypeChange = jest.fn();
    render(<AnalysisPlotView {...defaultProps} onPlotTypeChange={onPlotTypeChange} />);
    const select = screen.getByLabelText("Plot type");
    await userEvent.selectOptions(select, "opdFan");
    expect(onPlotTypeChange).toHaveBeenCalledWith("opdFan");
  });

  it("renders the plot image when plotImageBase64 is provided", () => {
    render(<AnalysisPlotView {...defaultProps} plotImageBase64="xyz789" />);
    const img = screen.getByRole("img", { name: "Analysis plot" });
    expect(img).toHaveAttribute("src", "data:image/png;base64,xyz789");
  });

  it("shows loading text when loading is true", () => {
    render(<AnalysisPlotView {...defaultProps} loading />);
    expect(screen.getByText("Loading plot...")).toBeInTheDocument();
  });

  it("shows placeholder when no image and not loading", () => {
    render(<AnalysisPlotView {...defaultProps} />);
    expect(screen.getByText("No plot available")).toBeInTheDocument();
  });

  describe("autoHeight mode", () => {
    it("applies w-full and h-auto classes to the plot image", () => {
      render(<AnalysisPlotView {...defaultProps} plotImageBase64="xyz789" autoHeight />);
      const img = screen.getByRole("img", { name: "Analysis plot" });
      expect(img).toHaveClass("w-full");
      expect(img).toHaveClass("h-auto");
    });

    it("does not apply max-h-full to the plot image", () => {
      render(<AnalysisPlotView {...defaultProps} plotImageBase64="xyz789" autoHeight />);
      const img = screen.getByRole("img", { name: "Analysis plot" });
      expect(img).not.toHaveClass("max-h-full");
    });
  });
});
