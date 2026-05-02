import { act, render, screen } from "@testing-library/react";
import { DiffractionMtfChart } from "@/features/analysis/components/DiffractionMtfChart";
import { globalTokens } from "@/shared/tokens/styleTokens";
import type { DiffractionMtfData } from "@/features/analysis/types/plotData";

let mockSetOption: jest.Mock;
let mockDispose: jest.Mock;
let mockResize: jest.Mock;
let mockEchartsInit: jest.Mock;
let mockResizeObserverObserve: jest.Mock;
let mockResizeObserverDisconnect: jest.Mock;
let mockBuildDiffractionMtfOption: jest.Mock;

jest.mock("echarts/core", () => ({
  init: (...args: unknown[]) => mockEchartsInit(...args),
}), { virtual: true });

jest.mock("@/features/analysis/components/DiffractionMtfChart/diffractionMtfChartOption", () => ({
  buildDiffractionMtfOption: (...args: unknown[]) => mockBuildDiffractionMtfOption(...args),
}));

jest.mock("@/shared/components/providers/ThemeProvider", () => ({
  useTheme: jest.fn(() => ({ theme: "light" })),
}));

describe("DiffractionMtfChart", () => {
  const diffractionMtfData: DiffractionMtfData = {
    fieldIdx: 0,
    wvlIdx: 0,
    Tangential: { x: [0, 10], y: [1, 0.5] },
    Sagittal: { x: [0, 10], y: [1, 0.4] },
    IdealTangential: { x: [0, 10], y: [1, 0.7] },
    IdealSagittal: { x: [0, 10], y: [1, 0.6] },
    unitX: "cycles/mm",
    unitY: "",
    cutoffTangential: 42,
    cutoffSagittal: 40,
    naTangential: 0.012,
    naSagittal: 0.011,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
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
    mockBuildDiffractionMtfOption = jest.fn(() => ({ series: [] }));

    class MockResizeObserver implements ResizeObserver {
      observe = mockResizeObserverObserve;
      unobserve = jest.fn();
      disconnect = mockResizeObserverDisconnect;

      constructor(_callback: ResizeObserverCallback) {}
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
      get: () => 300,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("measures the parent and builds a chart option from the measured dimensions", () => {
    render(<DiffractionMtfChart diffractionMtfData={diffractionMtfData} />);

    expect(mockBuildDiffractionMtfOption).toHaveBeenCalledWith(
      diffractionMtfData,
      400,
      300,
      globalTokens.echarts.text.light,
    );
    expect(screen.getByTestId("diffraction-mtf-chart")).toHaveStyle({
      width: "400px",
      height: "300px",
    });
  });

  it("debounces ECharts rendering by 500ms and resizes after setting the option", () => {
    render(<DiffractionMtfChart diffractionMtfData={diffractionMtfData} />);

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(mockEchartsInit).toHaveBeenCalledWith(
      expect.any(HTMLDivElement),
      undefined,
      { renderer: "canvas" },
    );
    expect(mockSetOption).toHaveBeenCalledWith({ series: [] }, true);
    expect(mockResize).toHaveBeenCalled();
  });

  it("disposes the chart instance on unmount", () => {
    const { unmount } = render(<DiffractionMtfChart diffractionMtfData={diffractionMtfData} />);

    act(() => {
      jest.advanceTimersByTime(500);
    });
    unmount();

    expect(mockDispose).toHaveBeenCalled();
    expect(mockResizeObserverDisconnect).toHaveBeenCalled();
  });
});
