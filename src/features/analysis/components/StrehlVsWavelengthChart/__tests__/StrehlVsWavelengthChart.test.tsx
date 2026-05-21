import { act, render, screen } from "@testing-library/react";
import { StrehlVsWavelengthChart } from "@/features/analysis/components/StrehlVsWavelengthChart";
import type { StrehlVsWavelengthData } from "@/features/analysis/types/plotData";

let mockSetOption: jest.Mock;
let mockDispose: jest.Mock;
let mockResize: jest.Mock;
let mockEchartsInit: jest.Mock;

jest.mock("@/shared/components/providers/ThemeProvider", () => ({
  useTheme: () => ({ theme: "light" }),
}));

jest.mock("echarts/core", () => ({
  use: jest.fn(),
  init: (...args: unknown[]) => mockEchartsInit(...args),
}), { virtual: true });

jest.mock("echarts/charts", () => ({
  LineChart: {},
}), { virtual: true });

jest.mock("echarts/components", () => ({
  GridComponent: {},
  TooltipComponent: {},
}), { virtual: true });

jest.mock("echarts/renderers", () => ({
  CanvasRenderer: {},
}), { virtual: true });

describe("StrehlVsWavelengthChart", () => {
  const strehlVsWavelengthData: StrehlVsWavelengthData = {
    fieldIdx: 0,
    x: [486.1, 587.6, 656.3],
    y: [0.72, 0.94, 0.81],
    unitX: "nm",
    unitY: "",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockSetOption = jest.fn();
    mockDispose = jest.fn();
    mockResize = jest.fn();
    mockEchartsInit = jest.fn(() => ({
      setOption: mockSetOption,
      resize: mockResize,
      dispose: mockDispose,
    }));
    class MockResizeObserver implements ResizeObserver {
      observe = jest.fn();
      unobserve = jest.fn();
      disconnect = jest.fn();

      constructor(_callback: ResizeObserverCallback) {}
    }
    Object.defineProperty(window, "ResizeObserver", {
      configurable: true,
      writable: true,
      value: MockResizeObserver,
    });
    Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 480 });
    Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => 320 });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders the ECharts host with the expected test id and aria label", () => {
    render(<StrehlVsWavelengthChart strehlVsWavelengthData={strehlVsWavelengthData} />);

    expect(screen.getByTestId("strehl-vs-wavelength-chart")).toHaveAttribute("aria-label", "Strehl vs Wavelength plot");
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(mockEchartsInit).toHaveBeenCalled();
  });
});
