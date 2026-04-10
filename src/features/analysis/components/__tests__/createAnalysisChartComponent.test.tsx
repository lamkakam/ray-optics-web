import React from "react";
import { act, render, screen } from "@testing-library/react";
import { createAnalysisChartComponent } from "@/features/analysis/components/createAnalysisChartComponent";
import { globalTokens } from "@/shared/tokens/styleTokens";
import { useTheme } from "@/shared/components/providers/ThemeProvider";

let mockSetOption: jest.Mock;
let mockDispose: jest.Mock;
let mockResize: jest.Mock;
let mockEchartsInit: jest.Mock;
let mockResizeObserverObserve: jest.Mock;
let mockResizeObserverDisconnect: jest.Mock;
let resizeObserverCallback: ResizeObserverCallback | undefined;
let mockBuildOption: jest.Mock;
let mockGetChartHeight: jest.Mock;

jest.mock("echarts/core", () => ({
  init: (...args: unknown[]) => mockEchartsInit(...args),
}), { virtual: true });

jest.mock("@/shared/components/providers/ThemeProvider", () => ({
  useTheme: jest.fn(() => ({ theme: "light" })),
}));

describe("createAnalysisChartComponent", () => {
  type TestChartProps = {
    readonly data: string;
    readonly autoHeight?: boolean;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (useTheme as jest.Mock).mockReturnValue({ theme: "light" });
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
    mockBuildOption = jest.fn(() => ({ series: [] }));
    mockGetChartHeight = jest.fn(({ parentWidth }: { readonly parentWidth: number }) => parentWidth / 4);
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
      get: () => 300,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("uses the injected sizing policy to measure the chart and build the option", () => {
    const TestChart = createAnalysisChartComponent<TestChartProps, string>({
      displayName: "TestChart",
      testId: "test-chart",
      ariaLabel: "Test chart",
      debounceMs: 500,
      getBuilderArgs: ({ data }) => data,
      getChartHeight: ({ parentWidth, parentHeight, autoHeight }) =>
        mockGetChartHeight({ parentWidth, parentHeight, autoHeight }),
      buildOption: (data, width, height, chartTextColor) =>
        mockBuildOption(data, width, height, chartTextColor),
    });

    render(<TestChart data="series-a" autoHeight />);

    expect(mockGetChartHeight).toHaveBeenCalledWith({
      parentWidth: 400,
      parentHeight: 300,
      autoHeight: true,
    });
    expect(mockBuildOption).toHaveBeenCalledWith(
      "series-a",
      400,
      100,
      globalTokens.echarts.text.light,
    );
    expect(screen.getByTestId("test-chart")).toHaveStyle({
      width: "400px",
      height: "100px",
    });
  });

  it("uses the dark theme text color and disposes the chart on unmount", () => {
    (useTheme as jest.Mock).mockReturnValue({ theme: "dark" });

    const TestChart = createAnalysisChartComponent<TestChartProps, string>({
      displayName: "TestChart",
      testId: "test-chart",
      ariaLabel: "Test chart",
      debounceMs: 500,
      getBuilderArgs: ({ data }) => data,
      getChartHeight: ({ parentWidth }) => parentWidth,
      buildOption: (data, width, height, chartTextColor) =>
        mockBuildOption(data, width, height, chartTextColor),
    });

    const { unmount } = render(<TestChart data="series-b" />);

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(mockBuildOption).toHaveBeenCalledWith(
      "series-b",
      400,
      400,
      globalTokens.echarts.text.dark,
    );

    unmount();

    expect(mockDispose).toHaveBeenCalled();
    expect(mockResizeObserverDisconnect).toHaveBeenCalled();
  });

  it("allows custom dimension validation to suppress option building", () => {
    const TestChart = createAnalysisChartComponent<TestChartProps, string>({
      displayName: "TestChart",
      testId: "test-chart",
      ariaLabel: "Test chart",
      debounceMs: 500,
      getBuilderArgs: ({ data }) => data,
      getChartHeight: () => 0,
      isDimensionValid: ({ width, height }) => width > 0 && height > 0,
      buildOption: (data, width, height, chartTextColor) =>
        mockBuildOption(data, width, height, chartTextColor),
    });

    render(<TestChart data="series-c" />);

    expect(mockBuildOption).not.toHaveBeenCalled();
    expect(screen.getByTestId("test-chart")).not.toHaveStyle({
      width: "400px",
      height: "0px",
    });
  });

  it("updates dimensions when the parent resizes", () => {
    const TestChart = createAnalysisChartComponent<TestChartProps, string>({
      displayName: "TestChart",
      testId: "test-chart",
      ariaLabel: "Test chart",
      debounceMs: 500,
      getBuilderArgs: ({ data }) => data,
      getChartHeight: ({ parentWidth }) => parentWidth,
      buildOption: (data, width, height, chartTextColor) =>
        mockBuildOption(data, width, height, chartTextColor),
    });

    render(
      <div style={{ width: "640px", height: "480px" }}>
        <TestChart data="series-d" />
      </div>
    );

    const chart = screen.getByTestId("test-chart");
    const chartParent = chart.parentElement as HTMLDivElement;
    Object.defineProperty(chartParent, "clientWidth", { configurable: true, value: 640 });
    Object.defineProperty(chartParent, "clientHeight", { configurable: true, value: 480 });

    act(() => {
      resizeObserverCallback?.(
        [{ target: chartParent, contentRect: { width: 640, height: 480 } as DOMRectReadOnly }] as unknown as ResizeObserverEntry[],
        {} as ResizeObserver,
      );
    });

    expect(mockBuildOption).toHaveBeenLastCalledWith(
      "series-d",
      640,
      640,
      globalTokens.echarts.text.light,
    );
    expect(chart).toHaveStyle({ width: "640px", height: "640px" });
  });

  it("resizes an existing echarts instance immediately when the parent shrinks before the debounce completes", () => {
    const TestChart = createAnalysisChartComponent<TestChartProps, string>({
      displayName: "TestChart",
      testId: "test-chart",
      ariaLabel: "Test chart",
      debounceMs: 500,
      getBuilderArgs: ({ data }) => data,
      getChartHeight: ({ parentHeight }) => parentHeight,
      buildOption: (data, width, height, chartTextColor) =>
        mockBuildOption(data, width, height, chartTextColor),
    });

    render(
      <div style={{ width: "640px", height: "480px" }}>
        <TestChart data="series-e" />
      </div>
    );

    act(() => {
      jest.advanceTimersByTime(500);
    });

    const chart = screen.getByTestId("test-chart");
    const chartParent = chart.parentElement as HTMLDivElement;
    Object.defineProperty(chartParent, "clientWidth", { configurable: true, value: 640 });
    Object.defineProperty(chartParent, "clientHeight", { configurable: true, value: 180 });

    act(() => {
      resizeObserverCallback?.(
        [{ target: chartParent, contentRect: { width: 640, height: 180 } as DOMRectReadOnly }] as unknown as ResizeObserverEntry[],
        {} as ResizeObserver,
      );
    });

    expect(chart).toHaveStyle({ width: "640px", height: "180px" });
    expect(mockResize).toHaveBeenLastCalledWith({ width: 640, height: 180 });
  });
});
