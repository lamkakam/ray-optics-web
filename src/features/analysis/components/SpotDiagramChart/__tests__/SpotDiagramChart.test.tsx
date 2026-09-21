/** Covers chart rendering and radius chip updates from data and spectral weights. */
import { render, screen } from "@testing-library/react";
import { SpotDiagramChart } from "@/features/analysis/components/SpotDiagramChart";
import { globalTokens } from "@/shared/tokens/styleTokens";
import type { SpotDiagramData } from "@/features/analysis/types/plotData";

let mockBuildSpotDiagramOption: jest.Mock;
const mockSetOption = jest.fn();
const mockResize = jest.fn();
const mockDispose = jest.fn();

jest.mock(
  "echarts/core",
  () => ({
    use: jest.fn(),
    init: jest.fn(() => ({
      setOption: mockSetOption,
      resize: mockResize,
      dispose: mockDispose,
    })),
  }),
  { virtual: true },
);

jest.mock(
  "@/features/analysis/components/SpotDiagramChart/spotDiagramChartOption",
  () => ({
    buildSpotDiagramOption: (...args: unknown[]) =>
      mockBuildSpotDiagramOption(...args),
  }),
);

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
    global.ResizeObserver =
      ResizeObserverMock as unknown as typeof ResizeObserver;
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
        wavelengthWeights={[1, 1, 1]}
      />,
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
    expect(screen.getByText("GEO radius: 22 µm")).toBeInTheDocument();
    expect(screen.getByText("RMS radius: 18 µm")).toBeInTheDocument();
  });

  it("updates chips when weights or data change and shows N/A for unavailable radii", () => {
    const data = [
      { ...spotDiagramData[0], x: [0.003], y: [0.004] },
      { ...spotDiagramData[0], wvlIdx: 1, x: [0], y: [0.01] },
    ];
    const { rerender } = render(
      <SpotDiagramChart
        spotDiagramData={data}
        wavelengthLabels={[]}
        wavelengthWeights={[1, 0]}
      />,
    );
    expect(screen.getByText("GEO radius: 5 µm")).toBeInTheDocument();
    expect(screen.getByText("RMS radius: 5 µm")).toBeInTheDocument();
    rerender(
      <SpotDiagramChart
        spotDiagramData={data}
        wavelengthLabels={[]}
        wavelengthWeights={[1, 3]}
      />,
    );
    expect(screen.getByText("GEO radius: 10 µm")).toBeInTheDocument();
    expect(screen.getByText("RMS radius: 9 µm")).toBeInTheDocument();
    rerender(
      <SpotDiagramChart
        spotDiagramData={[
          { ...data[0], x: [3], y: [4], unitX: "arcsec", unitY: "arcsec" },
        ]}
        wavelengthLabels={[]}
        wavelengthWeights={[1]}
      />,
    );
    expect(screen.getByText("GEO radius: 5 arcsec")).toBeInTheDocument();
    expect(screen.getByText("RMS radius: 5 arcsec")).toBeInTheDocument();
    rerender(
      <SpotDiagramChart
        spotDiagramData={[]}
        wavelengthLabels={[]}
        wavelengthWeights={[1]}
      />,
    );
    expect(screen.getByText("GEO radius: N/A")).toBeInTheDocument();
    expect(screen.getByText("RMS radius: N/A")).toBeInTheDocument();
  });
});
