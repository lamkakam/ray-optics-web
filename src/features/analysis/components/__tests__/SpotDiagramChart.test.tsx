import React from "react";
import { render, screen } from "@testing-library/react";
import { SpotDiagramChart } from "@/features/analysis/components/SpotDiagramChart";
import { globalTokens } from "@/shared/tokens/styleTokens";
import type { SpotDiagramData } from "@/shared/lib/types/opticalModel";

let mockBuildSpotDiagramOption: jest.Mock;
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

jest.mock("@/features/analysis/components/spotDiagramChartOption", () => ({
  buildSpotDiagramOption: (...args: unknown[]) => mockBuildSpotDiagramOption(...args),
}));

jest.mock("@/shared/components/providers/ThemeProvider", () => ({
  useTheme: jest.fn(() => ({ theme: "light" })),
}));

describe("SpotDiagramChart", () => {
  const spotDiagramData: SpotDiagramData = [
    {
      fieldIdx: 0,
      wvlIdx: 0,
      x: [-0.02, 0, 0.02],
      y: [-0.01, 0, 0.01],
      unitX: "mm",
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
    mockBuildSpotDiagramOption = jest.fn(() => ({ series: [] }));
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get() {
        return 400;
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
      <SpotDiagramChart
        spotDiagramData={spotDiagramData}
        wavelengthLabels={["486.1 nm", "587.6 nm", "656.3 nm"]}
      />
    );

    jest.runAllTimers();

    expect(screen.getByTestId("spot-diagram-chart")).toBeInTheDocument();
    expect(mockBuildSpotDiagramOption).toHaveBeenCalledWith(
      spotDiagramData,
      ["486.1 nm", "587.6 nm", "656.3 nm"],
      400,
      400,
      globalTokens.echarts.text.light,
    );
    expect(mockSetOption).toHaveBeenCalled();
  });
});
