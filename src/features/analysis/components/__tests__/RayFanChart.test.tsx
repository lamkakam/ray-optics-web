import React from "react";
import { render, screen } from "@testing-library/react";
import { RayFanChart } from "@/features/analysis/components/RayFanChart";
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

jest.mock("@/features/analysis/components/rayFanChartOption", () => ({
  buildRayFanChartOption: (...args: unknown[]) => mockBuildRayFanChartOption(...args),
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
    public constructor(private readonly callback: () => void) {}
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
    );
    expect(mockSetOption).toHaveBeenCalled();
  });
});
