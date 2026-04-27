import { act, render, screen } from "@testing-library/react";
import { DiffractionPsfChart } from "@/features/analysis/components/diffraction-psf-chart/DiffractionPsfChart";
import { globalTokens } from "@/shared/tokens/styleTokens";
import type { DiffractionPsfData } from "@/features/analysis/types/plotData";

let mockSetOption: jest.Mock;
let mockDispose: jest.Mock;
let mockResize: jest.Mock;
let mockEchartsInit: jest.Mock;
let mockResizeObserverObserve: jest.Mock;
let mockResizeObserverDisconnect: jest.Mock;
let resizeObserverCallback: ResizeObserverCallback | undefined;
let mockBuildDiffractionPsfOption: jest.Mock;

jest.mock("echarts/core", () => ({
  init: (...args: unknown[]) => mockEchartsInit(...args),
}), { virtual: true });

jest.mock("@/features/analysis/components/diffraction-psf-chart/diffractionPsfChartOption", () => ({
  buildDiffractionPsfOption: (...args: unknown[]) => mockBuildDiffractionPsfOption(...args),
}));

jest.mock("@/shared/components/providers/ThemeProvider", () => ({
  useTheme: jest.fn(() => ({ theme: "light" })),
}));

describe("DiffractionPsfChart", () => {
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
    mockBuildDiffractionPsfOption = jest.fn(() => ({ series: [] }));
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
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("measures the parent and builds a chart option from the measured dimensions", () => {
    render(<DiffractionPsfChart diffractionPsfData={diffractionPsfData} />);

    expect(mockBuildDiffractionPsfOption).toHaveBeenCalledWith(
      diffractionPsfData,
      400,
      400,
      globalTokens.echarts.text.light,
    );
    expect(screen.getByTestId("diffraction-psf-chart")).toHaveStyle({
      width: "400px",
      height: "400px",
    });
  });

  it("uses the full available chart width when the parent is wider than tall", () => {
    render(
      <div style={{ width: "600px", height: "400px" }}>
        <DiffractionPsfChart diffractionPsfData={diffractionPsfData} />
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

    expect(mockBuildDiffractionPsfOption).toHaveBeenLastCalledWith(
      diffractionPsfData,
      600,
      400,
      globalTokens.echarts.text.light,
    );
    expect(chart).toHaveStyle({ width: "600px", height: "400px" });
  });

  it("shrinks the chart height to zero when the available plot area collapses", () => {
    render(
      <div style={{ width: "400px", height: "400px" }}>
        <DiffractionPsfChart diffractionPsfData={diffractionPsfData} />
      </div>
    );

    const chart = screen.getByTestId("diffraction-psf-chart");
    const chartParent = chart.parentElement as HTMLDivElement;
    Object.defineProperty(chartParent, "clientWidth", { configurable: true, value: 400 });
    Object.defineProperty(chartParent, "clientHeight", { configurable: true, value: 0 });

    act(() => {
      resizeObserverCallback?.(
        [{ target: chartParent, contentRect: { width: 400, height: 0 } as DOMRectReadOnly }] as unknown as ResizeObserverEntry[],
        {} as ResizeObserver,
      );
    });

    expect(mockBuildDiffractionPsfOption).toHaveBeenLastCalledWith(
      diffractionPsfData,
      400,
      0,
      globalTokens.echarts.text.light,
    );
    expect(chart).toHaveStyle({ width: "400px", height: "0px" });
  });

  it("debounces ECharts rendering by 500ms and resizes after setting the option", () => {
    render(<DiffractionPsfChart diffractionPsfData={diffractionPsfData} />);

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
    expect(mockSetOption).toHaveBeenCalledWith({ series: [] }, true);
    expect(mockResize).toHaveBeenCalled();
  });

  it("disposes the chart instance on unmount", () => {
    const { unmount } = render(<DiffractionPsfChart diffractionPsfData={diffractionPsfData} />);

    act(() => {
      jest.advanceTimersByTime(500);
    });

    unmount();

    expect(mockDispose).toHaveBeenCalled();
    expect(mockResizeObserverDisconnect).toHaveBeenCalled();
  });
});
