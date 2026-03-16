import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AnalysisPlotView } from "@/components/composite/AnalysisPlotView";
import { useScreenBreakpoint } from "@/hooks/useScreenBreakpoint";

jest.mock("@/hooks/useScreenBreakpoint", () => ({
  useScreenBreakpoint: jest.fn(),
}));

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

  beforeEach(() => {
    jest.clearAllMocks();
    (useScreenBreakpoint as jest.Mock).mockReturnValue("screenLG");
  });

  it("renders field selector with correct options", () => {
    render(<AnalysisPlotView {...defaultProps} />);
    const select = screen.getByLabelText("Field");
    expect(select).toBeInTheDocument();
    expect(screen.getByText("0.0°")).toBeInTheDocument();
    expect(screen.getByText("14.0°")).toBeInTheDocument();
    expect(screen.getByText("20.0°")).toBeInTheDocument();
  });

  it("renders plot type selector with four options", () => {
    render(<AnalysisPlotView {...defaultProps} />);
    const select = screen.getByLabelText("Plot type");
    expect(select).toBeInTheDocument();
    expect(screen.getByText("Ray Fan")).toBeInTheDocument();
    expect(screen.getByText("OPD Fan")).toBeInTheDocument();
    expect(screen.getByText("Spot Diagram")).toBeInTheDocument();
    expect(screen.getByText("Surface by Surface 3rd Order Aberr.")).toBeInTheDocument();
  });

  it("field selector is enabled when selectedPlotType is rayFan", () => {
    render(<AnalysisPlotView {...defaultProps} selectedPlotType="rayFan" />);
    const fieldSelect = screen.getByLabelText("Field");
    expect(fieldSelect).not.toBeDisabled();
  });

  it("field selector is disabled when selectedPlotType is surfaceBySurface3rdOrder", () => {
    render(
      <AnalysisPlotView
        {...defaultProps}
        selectedPlotType={"surfaceBySurface3rdOrder" as Parameters<typeof AnalysisPlotView>[0]["selectedPlotType"]}
      />
    );
    const fieldSelect = screen.getByLabelText("Field");
    expect(fieldSelect).toBeDisabled();
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

  describe("responsive dropdown size", () => {
    it("uses compact selects on small screens", () => {
      (useScreenBreakpoint as jest.Mock).mockReturnValue("screenSM");
      render(<AnalysisPlotView {...defaultProps} />);
      const field = screen.getByLabelText("Field");
      const plotType = screen.getByLabelText("Plot type");
      expect(field).toHaveClass("px-2");
      expect(field).not.toHaveClass("px-3");
      expect(plotType).toHaveClass("px-2");
      expect(plotType).not.toHaveClass("px-3");
    });

    it("uses default selects on large screens", () => {
      (useScreenBreakpoint as jest.Mock).mockReturnValue("screenLG");
      render(<AnalysisPlotView {...defaultProps} />);
      const field = screen.getByLabelText("Field");
      const plotType = screen.getByLabelText("Plot type");
      expect(field).toHaveClass("w-full");
      expect(field).not.toHaveClass("px-2");
      expect(plotType).toHaveClass("w-full");
      expect(plotType).not.toHaveClass("px-2");
    });
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
