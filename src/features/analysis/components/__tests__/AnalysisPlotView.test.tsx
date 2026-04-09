import React from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AnalysisPlotView } from "@/features/analysis/components/AnalysisPlotView";
import type { DiffractionPsfData } from "@/shared/lib/types/opticalModel";
import { useScreenBreakpoint } from "@/shared/hooks/useScreenBreakpoint";

let mockSetOption: jest.Mock;
let mockDispose: jest.Mock;
let mockResize: jest.Mock;
let mockEchartsInit: jest.Mock;
let mockResizeObserverObserve: jest.Mock;
let mockResizeObserverDisconnect: jest.Mock;
let resizeObserverCallback: ResizeObserverCallback | undefined;

jest.mock("echarts/core", () => ({
  use: jest.fn(),
  init: (...args: unknown[]) => mockEchartsInit(...args),
}), { virtual: true });

jest.mock("echarts/charts", () => ({
  ScatterChart: {},
}), { virtual: true });

jest.mock("echarts/components", () => ({
  GridComponent: {},
  TooltipComponent: {},
  VisualMapComponent: {},
}), { virtual: true });

jest.mock("echarts/renderers", () => ({
  CanvasRenderer: {},
}), { virtual: true });

jest.mock("@/shared/hooks/useScreenBreakpoint", () => ({
  useScreenBreakpoint: jest.fn(),
}));

describe("AnalysisPlotView", () => {
  const diffractionPsfData: DiffractionPsfData = {
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
  };

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
    mockSetOption = jest.fn();
    mockDispose = jest.fn();
    mockResize = jest.fn();
    mockEchartsInit = jest.fn(() => ({
      setOption: mockSetOption,
      dispose: mockDispose,
      resize: mockResize,
    }));
    mockResizeObserverObserve = jest.fn();
    mockResizeObserverDisconnect = jest.fn();
    resizeObserverCallback = undefined;
    class MockResizeObserver implements ResizeObserver {
      observe = mockResizeObserverObserve;
      unobserve = jest.fn();
      disconnect = mockResizeObserverDisconnect;

      constructor(callback: ResizeObserverCallback) {
        resizeObserverCallback = callback;
      }
    }

    Object.defineProperty(window, "ResizeObserver", {
      configurable: true,
      writable: true,
      value: MockResizeObserver,
    });
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get: () => 400,
    });
    Object.defineProperty(HTMLElement.prototype, "clientHeight", {
      configurable: true,
      get: () => 400,
    });
    (useScreenBreakpoint as jest.Mock).mockReturnValue("screenLG");
  });

  afterEach(() => {
    jest.useRealTimers();
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
        diffractionPsfData={diffractionPsfData}
      />
    );
    expect(screen.getByTestId("diffraction-psf-chart")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Analysis plot" })).not.toBeInTheDocument();
  });

  it("keeps the diffraction PSF chart container square based on the parent dimensions", () => {
    render(
      <div style={{ width: "600px", height: "400px" }}>
        <AnalysisPlotView
          {...defaultProps}
          selectedPlotType="diffractionPSF"
          diffractionPsfData={diffractionPsfData}
        />
      </div>
    );

    const chart = screen.getByTestId("diffraction-psf-chart");
    const chartParent = chart.parentElement as HTMLDivElement;
    Object.defineProperty(chartParent, "clientWidth", { configurable: true, value: 600 });
    Object.defineProperty(chartParent, "clientHeight", { configurable: true, value: 400 });

    act(() => {
      resizeObserverCallback?.(
        [{ target: chartParent, contentRect: { width: 600, height: 400 } as DOMRectReadOnly }] as unknown as ResizeObserverEntry[],
        {} as ResizeObserver,
      );
    });

    expect(chart).toHaveStyle({ width: "400px", height: "400px" });
  });

  it("debounces diffraction PSF chart rendering by 500ms and uses the expected ECharts option", () => {
    jest.useFakeTimers();
    render(
      <AnalysisPlotView
        {...defaultProps}
        selectedPlotType="diffractionPSF"
        diffractionPsfData={diffractionPsfData}
      />
    );

    expect(mockEchartsInit).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(499);
    });
    expect(mockEchartsInit).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(1);
    });

    expect(mockEchartsInit).toHaveBeenCalledWith(
      expect.any(HTMLDivElement),
      undefined,
      { renderer: "canvas" },
    );
    expect(mockSetOption).toHaveBeenCalledTimes(1);

    const option = mockSetOption.mock.calls[0][0];
    expect(option.tooltip).toEqual({
      trigger: "none",
      axisPointer: {
        type: "cross",
      },
    });
    expect(option.xAxis.min).toBe(-0.02);
    expect(option.xAxis.max).toBe("0.020");
    expect(option.yAxis.min).toBe(-0.02);
    expect(option.yAxis.max).toBe("0.020");
    expect(option.grid.width).toBe(option.grid.height);
    expect(option.series[0].type).toBe("scatter");
    expect(option.visualMap.min).toBeCloseTo(Math.log10(5e-4));
    expect(option.visualMap.inRange.color).toEqual([
      "#313695",
      "#4575b4",
      "#74add1",
      "#abd9e9",
      "#e0f3f8",
      "#ffffbf",
      "#fee090",
      "#fdae61",
      "#f46d43",
      "#d73027",
      "#a50026",
    ]);
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
      render(<AnalysisPlotView {...defaultProps} selectedPlotType="diffractionPSF" />);
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
