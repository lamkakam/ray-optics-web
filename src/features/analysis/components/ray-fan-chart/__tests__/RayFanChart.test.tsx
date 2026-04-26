import { render, screen } from "@testing-library/react";
import { RayFanChart } from "@/features/analysis/components/ray-fan-chart/RayFanChart";
import { globalTokens } from "@/shared/tokens/styleTokens";
import type { RayFanData } from "@/shared/lib/types/opticalModel";

let mockBuildRayFanChartOption: jest.Mock;
const mockSetOption = jest.fn();
const mockResize = jest.fn();
const mockDispose = jest.fn();

jest.mock("echarts/core", () => ({
  use: jest.fn(),
  init: jest.fn(() => ({
    setOption: mockSetOption,
    resize: mockResize,
    dispose: mockDispose,
  })),
}), { virtual: true });

jest.mock("@/features/analysis/components/ray-fan-chart/rayFanChartOption", () => ({
  buildRayFanChartOption: (...args: unknown[]) => mockBuildRayFanChartOption(...args),
}));

jest.mock("@/shared/components/providers/ThemeProvider", () => ({
  useTheme: jest.fn(() => ({ theme: "light" })),
}));

describe("RayFanChart", () => {
  const rayFanData: RayFanData = [
    {
      fieldIdx: 0,
      wvlIdx: 0,
      Sagittal: {
        x: [-1, 0, 1],
        y: [-0.2, 0, 0.2],
      },
      Tangential: {
        x: [-1, 0, 1],
        y: [-0.1, 0, 0.1],
      },
      unitX: "",
      unitY: "mm",
    },
  ];

  class ResizeObserverMock {
    public observe = jest.fn();
    public disconnect = jest.fn();
    public constructor(_callback: () => void) {}
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockBuildRayFanChartOption = jest.fn(() => ({ series: [] }));
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get() {
        return 800;
      },
    });
    Object.defineProperty(HTMLElement.prototype, "clientHeight", {
      configurable: true,
      get() {
        return 400;
      },
    });
    global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders the chart container and builds options with wavelength labels", () => {
    render(
      <RayFanChart
        rayFanData={rayFanData}
        wavelengthLabels={["486.1 nm", "587.6 nm", "656.3 nm"]}
      />
    );

    jest.runAllTimers();

    expect(screen.getByTestId("ray-fan-chart")).toBeInTheDocument();
    expect(mockBuildRayFanChartOption).toHaveBeenCalledWith(
      rayFanData,
      ["486.1 nm", "587.6 nm", "656.3 nm"],
      800,
      400,
      globalTokens.echarts.text.light,
    );
    expect(mockSetOption).toHaveBeenCalled();
  });

  it("clamps the fixed-height chart to the width-based fan layout when the parent is taller than needed", () => {
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get() {
        return 800;
      },
    });
    Object.defineProperty(HTMLElement.prototype, "clientHeight", {
      configurable: true,
      get() {
        return 900;
      },
    });

    render(
      <RayFanChart
        rayFanData={rayFanData}
        wavelengthLabels={["486.1 nm", "587.6 nm", "656.3 nm"]}
      />
    );

    jest.runAllTimers();

    expect(screen.getByTestId("ray-fan-chart")).toHaveStyle({
      width: "800px",
      height: "400px",
    });
    expect(mockBuildRayFanChartOption).toHaveBeenCalledWith(
      rayFanData,
      ["486.1 nm", "587.6 nm", "656.3 nm"],
      800,
      400,
      globalTokens.echarts.text.light,
    );
  });
});
