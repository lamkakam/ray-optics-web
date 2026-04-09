import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AnalysisPlotView } from "@/features/analysis/components/AnalysisPlotView";
import { useScreenBreakpoint } from "@/shared/hooks/useScreenBreakpoint";

jest.mock("@/shared/hooks/useScreenBreakpoint", () => ({
  useScreenBreakpoint: jest.fn(),
}));

const mockDiffractionPsfChart = jest.fn(({ autoHeight }: { readonly autoHeight?: boolean }) => (
  <div
    data-testid="diffraction-psf-chart"
    data-auto-height={autoHeight ? "true" : "false"}
  />
));

const mockWavefrontMapChart = jest.fn(({ autoHeight }: { readonly autoHeight?: boolean }) => (
  <div
    data-testid="wavefront-map-chart"
    data-auto-height={autoHeight ? "true" : "false"}
  />
));

const mockGeoPsfChart = jest.fn(({ autoHeight }: { readonly autoHeight?: boolean }) => (
  <div
    data-testid="geo-psf-chart"
    data-auto-height={autoHeight ? "true" : "false"}
  />
));

const mockSpotDiagramChart = jest.fn(({ autoHeight }: { readonly autoHeight?: boolean }) => (
  <div
    data-testid="spot-diagram-chart"
    data-auto-height={autoHeight ? "true" : "false"}
  />
));

jest.mock("@/features/analysis/components/DiffractionPsfChart", () => ({
  DiffractionPsfChart: (props: { readonly autoHeight?: boolean }) => mockDiffractionPsfChart(props),
}));

jest.mock("@/features/analysis/components/WavefrontMapChart", () => ({
  WavefrontMapChart: (props: { readonly autoHeight?: boolean }) => mockWavefrontMapChart(props),
}));

jest.mock("@/features/analysis/components/GeoPsfChart", () => ({
  GeoPsfChart: (props: { readonly autoHeight?: boolean }) => mockGeoPsfChart(props),
}));

jest.mock("@/features/analysis/components/SpotDiagramChart", () => ({
  SpotDiagramChart: (props: { readonly autoHeight?: boolean }) => mockSpotDiagramChart(props),
}));

describe("AnalysisPlotView", () => {
  const fieldOptions = [
    { label: "0.0°", value: 0 },
    { label: "14.0°", value: 1 },
    { label: "20.0°", value: 2 },
  ];

  const wavelengthOptions = [
    { label: "486.1nm", value: 0 },
    { label: "587.6nm", value: 1 },
    { label: "656.3nm", value: 2 },
  ];

  const defaultProps = {
    fieldOptions,
    wavelengthOptions,
    selectedFieldIndex: 0,
    selectedWavelengthIndex: 0,
    selectedPlotType: "rayFan" as const,
    onFieldChange: jest.fn(),
    onWavelengthChange: jest.fn(),
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

  it("renders plot type selector with all seven options", () => {
    render(<AnalysisPlotView {...defaultProps} />);
    const select = screen.getByLabelText("Plot type");
    expect(select).toBeInTheDocument();
    expect(screen.getByText("Ray Fan")).toBeInTheDocument();
    expect(screen.getByText("OPD Fan")).toBeInTheDocument();
    expect(screen.getByText("Spot Diagram")).toBeInTheDocument();
    expect(screen.getByText("Surface by Surface 3rd Order Aberr.")).toBeInTheDocument();
    expect(screen.getByText("Wavefront Map")).toBeInTheDocument();
    expect(screen.getByText("Geometric PSF")).toBeInTheDocument();
    expect(screen.getByText("Diffraction PSF")).toBeInTheDocument();
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

  it("renders a diffraction PSF chart instead of an image", () => {
    render(
      <AnalysisPlotView
        {...defaultProps}
        selectedPlotType="diffractionPSF"
        diffractionPsfData={{
          fieldIdx: 0,
          wvlIdx: 0,
          x: [-0.02, 0, 0.02],
          y: [-0.01, 0, 0.01],
          z: [
            [0.0001, 0.001, 0.0001],
            [0.01, 1, 0.01],
            [0.0001, 0.001, 0.0001],
          ],
          unitX: "mm",
          unitY: "mm",
          unitZ: "",
        }}
      />
    );
    expect(screen.getByTestId("diffraction-psf-chart")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Analysis plot" })).not.toBeInTheDocument();
    expect(mockDiffractionPsfChart).toHaveBeenCalledWith(expect.objectContaining({
      autoHeight: undefined,
    }));
  });

  it("renders a wavefront map chart instead of an image", () => {
    render(
      <AnalysisPlotView
        {...defaultProps}
        selectedPlotType="wavefrontMap"
        wavefrontMapData={{
          fieldIdx: 0,
          wvlIdx: 0,
          x: [-1, 0, 1],
          y: [-1, 0, 1],
          z: [
            [undefined, 0.1, undefined],
            [0.2, 0.3, 0.4],
            [undefined, 0.5, undefined],
          ],
          unitX: "",
          unitY: "",
          unitZ: "waves",
        }}
      />
    );

    expect(screen.getByTestId("wavefront-map-chart")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Analysis plot" })).not.toBeInTheDocument();
    expect(mockWavefrontMapChart).toHaveBeenCalledWith(expect.objectContaining({
      autoHeight: undefined,
    }));
  });

  it("renders a geometric PSF chart instead of an image", () => {
    render(
      <AnalysisPlotView
        {...defaultProps}
        selectedPlotType="geoPSF"
        geoPsfData={{
          fieldIdx: 0,
          wvlIdx: 0,
          x: [-0.02, 0, 0.02],
          y: [-0.01, 0, 0.01],
          unitX: "mm",
          unitY: "mm",
        }}
      />
    );

    expect(screen.getByTestId("geo-psf-chart")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Analysis plot" })).not.toBeInTheDocument();
    expect(mockGeoPsfChart).toHaveBeenCalledWith(expect.objectContaining({
      autoHeight: undefined,
    }));
  });

  it("renders a spot diagram chart instead of an image", () => {
    render(
      <AnalysisPlotView
        {...defaultProps}
        selectedPlotType="spotDiagram"
        spotDiagramData={[
          {
            fieldIdx: 0,
            wvlIdx: 0,
            x: [-0.02, 0, 0.02],
            y: [-0.01, 0, 0.01],
            unitX: "mm",
            unitY: "mm",
          },
        ]}
      />
    );

    expect(screen.getByTestId("spot-diagram-chart")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Analysis plot" })).not.toBeInTheDocument();
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

  describe("wavelength selector", () => {
    it("does not render wavelength selector for non-wavelength-dependent plot types", () => {
      render(<AnalysisPlotView {...defaultProps} selectedPlotType="rayFan" />);
      expect(screen.queryByLabelText("Wavelength")).not.toBeInTheDocument();
    });

    it("renders wavelength selector when selectedPlotType is wavefrontMap", () => {
      render(<AnalysisPlotView {...defaultProps} selectedPlotType="wavefrontMap" />);
      expect(screen.getByLabelText("Wavelength")).toBeInTheDocument();
    });

    it("renders wavelength selector when selectedPlotType is geoPSF", () => {
      render(<AnalysisPlotView {...defaultProps} selectedPlotType="geoPSF" />);
      expect(screen.getByLabelText("Wavelength")).toBeInTheDocument();
    });

    it("renders wavelength selector when selectedPlotType is diffractionPSF", () => {
      render(
        <AnalysisPlotView
          {...defaultProps}
          selectedPlotType="diffractionPSF"
          diffractionPsfData={{
            fieldIdx: 0,
            wvlIdx: 0,
            x: [0],
            y: [0],
            z: [[1]],
            unitX: "mm",
            unitY: "mm",
            unitZ: "",
          }}
        />
      );
      expect(screen.getByLabelText("Wavelength")).toBeInTheDocument();
    });

    it("renders wavelength options correctly", () => {
      render(<AnalysisPlotView {...defaultProps} selectedPlotType="wavefrontMap" />);
      expect(screen.getByText("486.1nm")).toBeInTheDocument();
      expect(screen.getByText("587.6nm")).toBeInTheDocument();
      expect(screen.getByText("656.3nm")).toBeInTheDocument();
    });

    it("calls onWavelengthChange when wavelength is changed", async () => {
      const onWavelengthChange = jest.fn();
      render(
        <AnalysisPlotView
          {...defaultProps}
          selectedPlotType="wavefrontMap"
          onWavelengthChange={onWavelengthChange}
        />
      );
      const select = screen.getByLabelText("Wavelength");
      await userEvent.selectOptions(select, "2");
      expect(onWavelengthChange).toHaveBeenCalledWith(2);
    });
  });

  describe("new wavelength-dependent plot types", () => {
    it("field selector is enabled for wavefrontMap", () => {
      render(<AnalysisPlotView {...defaultProps} selectedPlotType="wavefrontMap" />);
      expect(screen.getByLabelText("Field")).not.toBeDisabled();
    });

    it("field selector is enabled for geoPSF", () => {
      render(<AnalysisPlotView {...defaultProps} selectedPlotType="geoPSF" />);
      expect(screen.getByLabelText("Field")).not.toBeDisabled();
    });

    it("field selector is enabled for diffractionPSF", () => {
      render(<AnalysisPlotView {...defaultProps} selectedPlotType="diffractionPSF" />);
      expect(screen.getByLabelText("Field")).not.toBeDisabled();
    });
  });
});
