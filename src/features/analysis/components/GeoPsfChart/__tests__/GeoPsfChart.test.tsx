import { act, render, screen } from "@testing-library/react";
import { GeoPsfChart } from "@/features/analysis/components/GeoPsfChart";
import { globalTokens } from "@/shared/tokens/styleTokens";
import type { GeoPsfData } from "@/features/analysis/types/plotData";

let mockSetOption: jest.Mock;
let mockDispose: jest.Mock;
let mockResize: jest.Mock;
let mockEchartsInit: jest.Mock;
let mockResizeObserverObserve: jest.Mock;
let mockResizeObserverDisconnect: jest.Mock;
let mockBuildGeoPsfOption: jest.Mock;

jest.mock("echarts/core", () => ({
  init: (...args: unknown[]) => mockEchartsInit(...args),
}), { virtual: true });

jest.mock("@/features/analysis/components/GeoPsfChart/geoPsfChartOption", () => ({
  buildGeoPsfOption: (...args: unknown[]) => mockBuildGeoPsfOption(...args),
}));

jest.mock("@/shared/components/providers/ThemeProvider", () => ({
  useTheme: jest.fn(() => ({ theme: "light" })),
}));

describe("GeoPsfChart", () => {
  const geoPsfData: GeoPsfData = {
    fieldIdx: 0,
    wvlIdx: 0,
    x: [-0.02, 0, 0.02],
    y: [-0.01, 0, 0.01],
    unitX: "mm",
    unitY: "mm",
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
    mockBuildGeoPsfOption = jest.fn(() => ({ series: [] }));

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
      get: () => 400,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("measures the parent and builds a chart option from the measured dimensions", () => {
    render(<GeoPsfChart geoPsfData={geoPsfData} />);

    expect(mockBuildGeoPsfOption).toHaveBeenCalledWith(
      geoPsfData,
      400,
      400,
      globalTokens.echarts.text.light,
    );
    expect(screen.getByTestId("geo-psf-chart")).toHaveStyle({
      width: "400px",
      height: "400px",
    });
  });

  it("debounces ECharts rendering by 500ms and resizes after setting the option", () => {
    render(<GeoPsfChart geoPsfData={geoPsfData} />);

    expect(mockEchartsInit).not.toHaveBeenCalled();

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
    const { unmount } = render(<GeoPsfChart geoPsfData={geoPsfData} />);

    act(() => {
      jest.advanceTimersByTime(500);
    });

    unmount();

    expect(mockDispose).toHaveBeenCalled();
    expect(mockResizeObserverDisconnect).toHaveBeenCalled();
  });
});
