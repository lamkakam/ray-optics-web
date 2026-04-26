import { act, render, screen } from "@testing-library/react";
import { WavefrontMapChart } from "@/features/analysis/components/wavefront-map-chart/WavefrontMapChart";
import { globalTokens } from "@/shared/tokens/styleTokens";
import type { WavefrontMapData } from "@/shared/lib/types/opticalModel";
import { useTheme } from "@/shared/components/providers/ThemeProvider";

let mockSetOption: jest.Mock;
let mockDispose: jest.Mock;
let mockResize: jest.Mock;
let mockEchartsInit: jest.Mock;
let mockResizeObserverObserve: jest.Mock;
let mockResizeObserverDisconnect: jest.Mock;
let mockBuildWavefrontMapOption: jest.Mock;

jest.mock("echarts/core", () => ({
  init: (...args: unknown[]) => mockEchartsInit(...args),
}), { virtual: true });

jest.mock("@/features/analysis/components/wavefront-map-chart/wavefrontMapChartOption", () => ({
  buildWavefrontMapOption: (...args: unknown[]) => mockBuildWavefrontMapOption(...args),
}));

jest.mock("@/shared/components/providers/ThemeProvider", () => ({
  useTheme: jest.fn(() => ({ theme: "light" })),
}));

describe("WavefrontMapChart", () => {
  const wavefrontMapData: WavefrontMapData = {
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
    mockBuildWavefrontMapOption = jest.fn(() => ({ series: [] }));

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
    render(<WavefrontMapChart wavefrontMapData={wavefrontMapData} />);

    expect(mockBuildWavefrontMapOption).toHaveBeenCalledWith(
      wavefrontMapData,
      400,
      400,
      globalTokens.echarts.text.light,
    );
    expect(screen.getByTestId("wavefront-map-chart")).toHaveStyle({
      width: "400px",
      height: "400px",
    });
  });

  it("passes the dark-theme chart text color to the option builder", () => {
    (useTheme as jest.Mock).mockReturnValue({ theme: "dark" });

    render(<WavefrontMapChart wavefrontMapData={wavefrontMapData} />);

    expect(mockBuildWavefrontMapOption).toHaveBeenCalledWith(
      wavefrontMapData,
      400,
      400,
      globalTokens.echarts.text.dark,
    );
  });

  it("debounces ECharts rendering by 500ms and resizes after setting the option", () => {
    render(<WavefrontMapChart wavefrontMapData={wavefrontMapData} />);

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
    const { unmount } = render(<WavefrontMapChart wavefrontMapData={wavefrontMapData} />);

    act(() => {
      jest.advanceTimersByTime(500);
    });

    unmount();

    expect(mockDispose).toHaveBeenCalled();
    expect(mockResizeObserverDisconnect).toHaveBeenCalled();
  });
});
