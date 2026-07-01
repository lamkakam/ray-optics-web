import { act, render, screen } from "@testing-library/react";
import { DiffractionPsfChart } from "@/features/analysis/components/DiffractionPsfChart";
import { DIFFRACTION_PSF_LOG_FLOOR } from "@/features/analysis/components/DiffractionPsfChart/diffractionPsfDeckData";
import type { DiffractionPsfData } from "@/features/analysis/types/plotData";

interface MockDeckGLProps {
  readonly children?: React.ReactNode;
  readonly onViewStateChange?: (event: {
    readonly viewState: {
      readonly target: readonly [number, number, number];
      readonly zoom?: number;
    };
  }) => void;
  readonly viewState?: Record<string, {
    readonly target: readonly [number, number, number];
    readonly zoom: number;
  }>;
}

const mockDeckGL = jest.fn(({ children }: MockDeckGLProps) => (
  <div data-testid="deck-gl">{children}</div>
));
const mockGridLayer = jest.fn((props: unknown) => ({ id: "grid-layer", props }));
const mockOrthographicView = jest.fn((props: unknown) => ({ id: "orthographic-view", props }));

jest.mock("deck.gl", () => ({
  COORDINATE_SYSTEM: {
    CARTESIAN: "cartesian",
  },
  DeckGL: (props: MockDeckGLProps) => mockDeckGL(props),
  GridLayer: function GridLayer(props: unknown) {
    return mockGridLayer(props);
  },
  OrthographicView: function OrthographicView(props: unknown) {
    return mockOrthographicView(props);
  },
}));

describe("DiffractionPsfChart", () => {
  const diffractionPsfData: DiffractionPsfData = {
    fieldIdx: 0,
    wvlIdx: 0,
    x: [-0.02, 0, 0.02],
    y: [-0.01, 0, 0.01],
    z: [
      [0.0001, 0.001, 0.0001],
      [0.01, 1, 0.01],
      [0.0001, 0.001, 0.0001],
    ],
    unitX: "mm",
    unitY: "mm",
    unitZ: "",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get: () => 400,
    });
    Object.defineProperty(HTMLElement.prototype, "clientHeight", {
      configurable: true,
      get: () => 400,
    });
  });

  it("renders an accessible diffraction PSF plot container", () => {
    render(<DiffractionPsfChart diffractionPsfData={diffractionPsfData} />);

    expect(screen.getByTestId("diffraction-psf-chart")).toHaveAttribute(
      "aria-label",
      "Diffraction PSF plot",
    );
  });

  it("creates a GPU GridLayer from normalized diffraction PSF bins", () => {
    render(<DiffractionPsfChart diffractionPsfData={diffractionPsfData} />);

    expect(mockGridLayer).toHaveBeenCalledWith(expect.objectContaining({
      gpuAggregation: true,
      colorAggregation: "SUM",
      coordinateSystem: "cartesian",
      cellSize: 0.01,
    }));

    const layerProps = mockGridLayer.mock.calls[0][0] as {
      readonly data: readonly unknown[];
      readonly getPosition: (datum: { readonly x: number; readonly y: number }) => [number, number];
      readonly getColorWeight: (datum: { readonly logScaledFlux: number }) => number;
      readonly colorDomain: readonly [number, number];
    };
    expect(layerProps.data).toHaveLength(9);
    expect(layerProps.getPosition({ x: 0.02, y: -0.01 })).toEqual([0.02, -0.01]);
    expect(layerProps.getColorWeight({ logScaledFlux: -3 })).toBe(-3);
    expect(layerProps.colorDomain[0]).toBe(DIFFRACTION_PSF_LOG_FLOOR);
  });

  it("uses an OrthographicView and initial zoom that fits the symmetric PSF extent", () => {
    render(<DiffractionPsfChart diffractionPsfData={diffractionPsfData} />);

    expect(mockOrthographicView).toHaveBeenCalledWith(expect.objectContaining({
      flipY: false,
      controller: true,
    }));
    expect(mockDeckGL).toHaveBeenLastCalledWith(expect.objectContaining({
      views: [expect.objectContaining({ id: "orthographic-view" })],
      viewState: expect.objectContaining({
        "diffraction-psf-view": expect.objectContaining({
          target: [0, 0, 0],
          zoom: expect.closeTo(Math.log2(192 / (2 * 0.02 * 1.12))),
        }),
      }),
    }));
  });

  it("keeps DeckGL view state controlled under the diffraction PSF view id after panning", () => {
    render(<DiffractionPsfChart diffractionPsfData={diffractionPsfData} />);

    const deckProps = mockDeckGL.mock.lastCall?.[0] as MockDeckGLProps;
    act(() => {
      deckProps.onViewStateChange?.({
        viewState: {
          target: [0.01, -0.01, 0],
          zoom: Math.log2(192 / (2 * 0.02)),
        },
      });
    });

    expect(mockDeckGL).toHaveBeenLastCalledWith(expect.objectContaining({
      viewState: {
        "diffraction-psf-view": {
          target: [0.01, -0.01, 0],
          zoom: Math.log2(192 / (2 * 0.02)),
        },
      },
    }));
  });

  it("updates x and y tick labels from the panned orthographic viewport", () => {
    render(<DiffractionPsfChart diffractionPsfData={diffractionPsfData} />);

    const deckProps = mockDeckGL.mock.lastCall?.[0] as MockDeckGLProps;
    act(() => {
      deckProps.onViewStateChange?.({
        viewState: {
          target: [0.01, -0.01, 0],
          zoom: Math.log2(192 / (2 * 0.02)),
        },
      });
    });

    expect(screen.getAllByText("-0.03").length).toBeGreaterThan(0);
    expect(screen.getAllByText("-0.02").length).toBeGreaterThan(0);
    expect(screen.getAllByText("0.03").length).toBeGreaterThan(0);
  });

  it("updates x and y tick labels from the zoomed orthographic viewport", () => {
    render(<DiffractionPsfChart diffractionPsfData={diffractionPsfData} />);

    const deckProps = mockDeckGL.mock.lastCall?.[0] as MockDeckGLProps;
    act(() => {
      deckProps.onViewStateChange?.({
        viewState: {
          target: [0, 0, 0],
          zoom: Math.log2(192 / (2 * 0.01)),
        },
      });
    });

    expect(screen.getAllByText("-0.01").length).toBeGreaterThan(0);
    expect(screen.getAllByText("-0.005").length).toBeGreaterThan(0);
    expect(screen.getAllByText("0.005").length).toBeGreaterThan(0);
    expect(screen.getAllByText("0.01").length).toBeGreaterThan(0);
  });

  it("displays axis labels, ticks, and the normalized flux color-bar label", () => {
    render(<DiffractionPsfChart diffractionPsfData={diffractionPsfData} />);

    expect(screen.getByText("x (mm)")).toBeInTheDocument();
    expect(screen.getByText("y (mm)")).toBeInTheDocument();
    expect(screen.getByText("Normalized flux/bin")).toBeInTheDocument();
    expect(screen.getByText("5e-4")).toBeInTheDocument();
    expect(screen.getAllByText("-0.022").length).toBeGreaterThan(0);
    expect(screen.getAllByText("0").length).toBeGreaterThan(0);
    expect(screen.getAllByText("0.022").length).toBeGreaterThan(0);
  });

  it("keeps the y-axis label aligned with a horizontally centered plot", () => {
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get: () => 600,
    });

    render(<DiffractionPsfChart diffractionPsfData={diffractionPsfData} />);

    const yAxisLabel = screen.getByText("y (mm)");

    expect(yAxisLabel).toHaveAttribute("x", "50");
    expect(yAxisLabel).toHaveAttribute("transform", "rotate(-90 50 180)");
  });

  it("uses theme-aware currentColor fills for SVG overlay text", () => {
    render(<DiffractionPsfChart diffractionPsfData={diffractionPsfData} />);

    expect(screen.getByText("x (mm)")).toHaveAttribute("fill", "currentColor");
    expect(screen.getByText("y (mm)")).toHaveAttribute("fill", "currentColor");
    expect(screen.getByText("Normalized flux/bin")).toHaveAttribute("fill", "currentColor");

    for (const tickLabel of screen.getAllByText("-0.022")) {
      expect(tickLabel).toHaveAttribute("fill", "currentColor");
    }
  });

  it("uses a square auto-height chart when requested", () => {
    render(<DiffractionPsfChart diffractionPsfData={diffractionPsfData} autoHeight />);

    expect(screen.getByTestId("diffraction-psf-chart")).toHaveStyle({
      width: "400px",
      height: "400px",
    });
  });
});
