import { act, render, screen } from "@testing-library/react";
import { YYbarChart } from "@/features/analysis/components/YYbarChart";
import type { YYbarData } from "@/features/analysis/types/plotData";

let mockSetOption: jest.Mock;
let mockDispose: jest.Mock;
let mockResize: jest.Mock;
let mockEchartsInit: jest.Mock;

jest.mock("@/shared/components/providers/ThemeProvider", () => ({
  useTheme: () => ({ theme: "light" }),
}));

jest.mock(
  "echarts/core",
  () => ({
    use: jest.fn(),
    init: (...args: unknown[]) => mockEchartsInit(...args),
  }),
  { virtual: true },
);

jest.mock(
  "echarts/charts",
  () => ({
    LineChart: {},
  }),
  { virtual: true },
);

jest.mock(
  "echarts/components",
  () => ({
    GridComponent: {},
    TooltipComponent: {},
  }),
  { virtual: true },
);

jest.mock(
  "echarts/renderers",
  () => ({
    CanvasRenderer: {},
  }),
  { virtual: true },
);

describe("YYbarChart", () => {
  const yYbarData: YYbarData = {
    surfaceLabels: ["1", "2", "Img"],
    y: [6.25, 5.9, 0.03],
    yBar: [-4.19, -3.22, 18.12],
    unit: "mm",
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
    }
    Object.defineProperty(window, "ResizeObserver", {
      configurable: true,
      writable: true,
      value: MockResizeObserver,
    });
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get: () => 480,
    });
    Object.defineProperty(HTMLElement.prototype, "clientHeight", {
      configurable: true,
      get: () => 320,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders the ECharts host with the expected test id and aria label", () => {
    render(<YYbarChart yYbarData={yYbarData} />);

    expect(screen.getByTestId("y-ybar-chart")).toHaveAttribute(
      "aria-label",
      "y-ȳ Diagram plot",
    );
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(mockEchartsInit).toHaveBeenCalled();
    expect(mockSetOption).toHaveBeenCalledWith(
      expect.objectContaining({
        series: [
          expect.objectContaining({
            type: "line",
            smooth: false,
            data: [
              [-4.19, 6.25],
              [-3.22, 5.9],
              [18.12, 0.03],
            ],
          }),
        ],
      }),
      expect.anything(),
    );
  });
});
