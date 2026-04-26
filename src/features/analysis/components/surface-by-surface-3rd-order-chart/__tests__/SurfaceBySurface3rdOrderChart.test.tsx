import { act, render, screen } from "@testing-library/react";
import { SurfaceBySurface3rdOrderChart } from "@/features/analysis/components/surface-by-surface-3rd-order-chart/SurfaceBySurface3rdOrderChart";
import { globalTokens } from "@/shared/tokens/styleTokens";
import type { SeidelSurfaceBySurfaceData } from "@/shared/lib/types/opticalModel";

let mockSetOption: jest.Mock;
let mockDispose: jest.Mock;
let mockResize: jest.Mock;
let mockEchartsInit: jest.Mock;
let mockResizeObserverObserve: jest.Mock;
let mockResizeObserverDisconnect: jest.Mock;
let mockBuildSurfaceBySurface3rdOrderChartOption: jest.Mock;

jest.mock("echarts/core", () => ({
  init: (...args: unknown[]) => mockEchartsInit(...args),
}), { virtual: true });

jest.mock("@/features/analysis/components/surface-by-surface-3rd-order-chart/surfaceBySurface3rdOrderChartOption", () => ({
  buildSurfaceBySurface3rdOrderChartOption: (...args: unknown[]) => mockBuildSurfaceBySurface3rdOrderChartOption(...args),
}));

jest.mock("@/shared/components/providers/ThemeProvider", () => ({
  useTheme: jest.fn(() => ({ theme: "light" })),
}));

describe("SurfaceBySurface3rdOrderChart", () => {
  const surfaceBySurface3rdOrderData: SeidelSurfaceBySurfaceData = {
    aberrTypes: ["S-I", "S-II", "S-III", "S-IV", "S-V"],
    surfaceLabels: ["S1", "S2", "sum"],
    data: [
      [0.1, 0.2, 0.3],
      [0.4, 0.5, 0.9],
      [0.6, 0.7, 1.3],
      [0.8, 0.9, 1.7],
      [1.0, 1.1, 2.1],
    ],
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
    mockBuildSurfaceBySurface3rdOrderChartOption = jest.fn(() => ({ series: [] }));

    class MockResizeObserver implements ResizeObserver {
      observe = mockResizeObserverObserve;
      unobserve = jest.fn();
      disconnect = mockResizeObserverDisconnect;
    }

    Object.defineProperty(window, "ResizeObserver", {
      configurable: true,
      writable: true,
      value: MockResizeObserver,
    });
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get: () => 800,
    });
    Object.defineProperty(HTMLElement.prototype, "clientHeight", {
      configurable: true,
      get: () => 400,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders the chart container and builds options from the measured size", () => {
    render(
      <SurfaceBySurface3rdOrderChart
        surfaceBySurface3rdOrderData={surfaceBySurface3rdOrderData}
      />
    );

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(screen.getByTestId("surface-by-surface-3rd-order-chart")).toBeInTheDocument();
    expect(mockBuildSurfaceBySurface3rdOrderChartOption).toHaveBeenCalledWith(
      surfaceBySurface3rdOrderData,
      800,
      400,
      globalTokens.echarts.text.light,
    );
    expect(mockSetOption).toHaveBeenCalledWith({ series: [] }, true);
  });

  it("uses the width-based auto-height sizing policy", () => {
    render(
      <SurfaceBySurface3rdOrderChart
        surfaceBySurface3rdOrderData={surfaceBySurface3rdOrderData}
        autoHeight
      />
    );

    expect(screen.getByTestId("surface-by-surface-3rd-order-chart")).toHaveStyle({
      width: "800px",
      height: "480px",
    });
  });

  it("clamps the fixed-height chart to the width-based layout when the parent is taller than needed", () => {
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get: () => 800,
    });
    Object.defineProperty(HTMLElement.prototype, "clientHeight", {
      configurable: true,
      get: () => 900,
    });

    render(
      <SurfaceBySurface3rdOrderChart
        surfaceBySurface3rdOrderData={surfaceBySurface3rdOrderData}
      />
    );

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(screen.getByTestId("surface-by-surface-3rd-order-chart")).toHaveStyle({
      width: "800px",
      height: "480px",
    });
    expect(mockBuildSurfaceBySurface3rdOrderChartOption).toHaveBeenCalledWith(
      surfaceBySurface3rdOrderData,
      800,
      480,
      globalTokens.echarts.text.light,
    );
  });
});
