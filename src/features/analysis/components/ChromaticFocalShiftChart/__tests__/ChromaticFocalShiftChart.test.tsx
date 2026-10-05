import { act, render, screen } from "@testing-library/react";
import { ChromaticFocalShiftChart } from "@/features/analysis/components/ChromaticFocalShiftChart";
import type { ChromaticFocalShiftData } from "@/features/analysis/types/plotData";

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
    TitleComponent: {},
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

describe("ChromaticFocalShiftChart", () => {
  const chromaticFocalShiftData: ChromaticFocalShiftData = {
    fieldIdx: 0,
    x: [0.02, 0, -0.01],
    y: [486.1, 587.6, 656.3],
    unitX: "mm",
    unitY: "nm",
    referenceWavelength: 587.6,
    maxFocalShiftRange: 0.03,
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
    render(
      <ChromaticFocalShiftChart
        chromaticFocalShiftData={chromaticFocalShiftData}
      />,
    );

    expect(screen.getByTestId("chromatic-focal-shift-chart")).toHaveAttribute(
      "aria-label",
      "Chromatic Focal Shift plot",
    );
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(mockEchartsInit).toHaveBeenCalled();
  });
});
