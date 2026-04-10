import React from "react";
import { render, screen } from "@testing-library/react";
import { OpdFanChart } from "@/features/analysis/components/opd-fan-chart/OpdFanChart";
import { globalTokens } from "@/shared/tokens/styleTokens";
import type { OpdFanData } from "@/shared/lib/types/opticalModel";

let mockBuildOpdFanChartOption: jest.Mock;
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

jest.mock("@/features/analysis/components/opd-fan-chart/opdFanChartOption", () => ({
  buildOpdFanChartOption: (...args: unknown[]) => mockBuildOpdFanChartOption(...args),
}));

jest.mock("@/shared/components/providers/ThemeProvider", () => ({
  useTheme: jest.fn(() => ({ theme: "light" })),
}));

describe("OpdFanChart", () => {
  const opdFanData: OpdFanData = [
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
      unitY: "waves",
    },
  ];

  class ResizeObserverMock {
    public observe = jest.fn();
    public disconnect = jest.fn();
    public constructor(private readonly callback: () => void) {}
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockBuildOpdFanChartOption = jest.fn(() => ({ series: [] }));
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
      <OpdFanChart
        opdFanData={opdFanData}
        wavelengthLabels={["486.1 nm", "587.6 nm", "656.3 nm"]}
      />
    );

    jest.runAllTimers();

    expect(screen.getByTestId("opd-fan-chart")).toBeInTheDocument();
    expect(mockBuildOpdFanChartOption).toHaveBeenCalledWith(
      opdFanData,
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
      <OpdFanChart
        opdFanData={opdFanData}
        wavelengthLabels={["486.1 nm", "587.6 nm", "656.3 nm"]}
      />
    );

    jest.runAllTimers();

    expect(screen.getByTestId("opd-fan-chart")).toHaveStyle({
      width: "800px",
      height: "400px",
    });
    expect(mockBuildOpdFanChartOption).toHaveBeenCalledWith(
      opdFanData,
      ["486.1 nm", "587.6 nm", "656.3 nm"],
      800,
      400,
      globalTokens.echarts.text.light,
    );
  });
});
