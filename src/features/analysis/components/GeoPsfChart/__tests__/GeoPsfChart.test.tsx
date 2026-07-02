import { act, render, screen } from "@testing-library/react";
import { GeoPsfChart } from "@/features/analysis/components/GeoPsfChart";
import type { GeoPsfData } from "@/features/analysis/types/plotData";

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
const mockScatterplotLayer = jest.fn((props: unknown) => ({ id: "scatterplot-layer", props }));
const mockOrthographicView = jest.fn((props: unknown) => ({ id: "orthographic-view", props }));

jest.mock("deck.gl", () => ({
  COORDINATE_SYSTEM: {
    CARTESIAN: "cartesian",
  },
  DeckGL: (props: MockDeckGLProps) => mockDeckGL(props),
  OrthographicView: function OrthographicView(props: unknown) {
    return mockOrthographicView(props);
  },
  ScatterplotLayer: function ScatterplotLayer(props: unknown) {
    return mockScatterplotLayer(props);
  },
}));

describe("GeoPsfChart", () => {
  const geoPsfData: GeoPsfData = {
    fieldIdx: 0,
    wvlIdx: 0,
    x: [-0.02, 0, 0.02],
    y: [-0.01, 0, 0.01],
    unitX: "mm",
    unitY: "mm",
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

  it("renders an accessible geometric PSF plot container", () => {
    render(<GeoPsfChart geoPsfData={geoPsfData} />);

    expect(screen.getByTestId("geo-psf-chart")).toHaveAttribute(
      "aria-label",
      "Geometric PSF plot",
    );
  });

  it("creates a ScatterplotLayer in Cartesian coordinates from geometric PSF points", () => {
    render(<GeoPsfChart geoPsfData={geoPsfData} />);

    expect(mockScatterplotLayer).toHaveBeenCalledWith(expect.objectContaining({
      coordinateSystem: "cartesian",
      getFillColor: [84, 112, 198, 166],
      getRadius: 1,
      radiusUnits: "pixels",
      pickable: false,
    }));

    const layerProps = mockScatterplotLayer.mock.calls[0][0] as {
      readonly data: readonly unknown[];
      readonly getPosition: (datum: { readonly x: number; readonly y: number }) => [number, number];
    };
    expect(layerProps.data).toEqual([
      { x: -0.02, y: -0.01 },
      { x: 0, y: 0 },
      { x: 0.02, y: 0.01 },
    ]);
    expect(layerProps.getPosition({ x: 0.02, y: -0.01 })).toEqual([0.02, -0.01]);
  });

  it("uses an OrthographicView and initial zoom that fits the symmetric PSF extent", () => {
    render(<GeoPsfChart geoPsfData={geoPsfData} />);

    expect(mockOrthographicView).toHaveBeenCalledWith(expect.objectContaining({
      id: "geo-psf-view",
      flipY: false,
      controller: true,
    }));
    expect(mockDeckGL).toHaveBeenLastCalledWith(expect.objectContaining({
      views: [expect.objectContaining({ id: "orthographic-view" })],
      viewState: expect.objectContaining({
        "geo-psf-view": expect.objectContaining({
          target: [0, 0, 0],
          zoom: expect.closeTo(Math.log2(192 / (2 * 0.02 * 1.12))),
        }),
      }),
    }));
  });

  it("keeps DeckGL view state controlled under the geometric PSF view id after panning", () => {
    render(<GeoPsfChart geoPsfData={geoPsfData} />);

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
        "geo-psf-view": {
          target: [0.01, -0.01, 0],
          zoom: Math.log2(192 / (2 * 0.02)),
        },
      },
    }));
  });

  it("updates x and y tick labels after panning and zooming", () => {
    render(<GeoPsfChart geoPsfData={geoPsfData} />);

    const deckProps = mockDeckGL.mock.lastCall?.[0] as MockDeckGLProps;
    act(() => {
      deckProps.onViewStateChange?.({
        viewState: {
          target: [0.01, -0.01, 0],
          zoom: Math.log2(192 / (2 * 0.01)),
        },
      });
    });

    expect(screen.getAllByText("0").length).toBeGreaterThan(0);
    expect(screen.getAllByText("-0.02").length).toBeGreaterThan(0);
    expect(screen.getAllByText("0.02").length).toBeGreaterThan(0);
  });

  it("displays theme-aware axis labels and ticks without a color bar", () => {
    render(<GeoPsfChart geoPsfData={geoPsfData} />);

    expect(screen.getByText("x (mm)")).toHaveAttribute("fill", "currentColor");
    expect(screen.getByText("y (mm)")).toHaveAttribute("fill", "currentColor");
    expect(screen.queryByText("Normalized flux/bin")).not.toBeInTheDocument();
    expect(screen.queryByText("waves")).not.toBeInTheDocument();
    expect(screen.getAllByText("-0.022").length).toBeGreaterThan(0);
    expect(screen.getAllByText("0.022").length).toBeGreaterThan(0);
  });

  it("uses a square auto-height chart when requested", () => {
    render(<GeoPsfChart geoPsfData={geoPsfData} autoHeight />);

    expect(screen.getByTestId("geo-psf-chart")).toHaveStyle({
      width: "400px",
      height: "400px",
    });
  });
});
