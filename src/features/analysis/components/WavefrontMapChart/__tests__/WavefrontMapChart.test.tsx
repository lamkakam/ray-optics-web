import { act, render, screen } from "@testing-library/react";
import { WavefrontMapChart } from "@/features/analysis/components/WavefrontMapChart";
import type { WavefrontMapData } from "@/features/analysis/types/plotData";

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
const mockBitmapLayer = jest.fn((props: unknown) => ({ id: "bitmap-layer", props }));
const mockOrthographicView = jest.fn((props: unknown) => ({ id: "orthographic-view", props }));

jest.mock("deck.gl", () => ({
  BitmapLayer: function BitmapLayer(props: unknown) {
    return mockBitmapLayer(props);
  },
  COORDINATE_SYSTEM: {
    CARTESIAN: "cartesian",
  },
  DeckGL: (props: MockDeckGLProps) => mockDeckGL(props),
  OrthographicView: function OrthographicView(props: unknown) {
    return mockOrthographicView(props);
  },
}));

describe("WavefrontMapChart", () => {
  const wavefrontMapData: WavefrontMapData = {
    fieldIdx: 0,
    wvlIdx: 0,
    x: [-1, 0, 1],
    y: [-1, 0, 1],
    z: [
      [undefined, 0.1, undefined],
      [0.2, 0.3, 0.4],
      [undefined, 0.5, undefined],
    ],
    unitX: "pupil",
    unitY: "pupil",
    unitZ: "waves",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    class MockImageData {
      readonly data: Uint8ClampedArray;
      readonly width: number;
      readonly height: number;

      constructor(data: Uint8ClampedArray, width: number, height: number) {
        this.data = data;
        this.width = width;
        this.height = height;
      }
    }

    Object.defineProperty(globalThis, "ImageData", {
      configurable: true,
      writable: true,
      value: MockImageData,
    });
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get: () => 400,
    });
    Object.defineProperty(HTMLElement.prototype, "clientHeight", {
      configurable: true,
      get: () => 400,
    });
  });

  it("renders an accessible wavefront map plot container", () => {
    render(<WavefrontMapChart wavefrontMapData={wavefrontMapData} />);

    expect(screen.getByTestId("wavefront-map-chart")).toHaveAttribute(
      "aria-label",
      "Wavefront Map plot",
    );
  });

  it("creates a BitmapLayer in Cartesian coordinates from the wavefront bitmap", () => {
    render(<WavefrontMapChart wavefrontMapData={wavefrontMapData} />);

    expect(mockBitmapLayer).toHaveBeenCalledWith(expect.objectContaining({
      coordinateSystem: "cartesian",
      bounds: [-1, -1, 1, 1],
      pickable: false,
    }));

    const layerProps = mockBitmapLayer.mock.calls[0][0] as {
      readonly image: ImageData;
    };
    expect(layerProps.image).toBeInstanceOf(ImageData);
    expect(layerProps.image.width).toBe(3);
    expect(layerProps.image.height).toBe(3);
    expect(Array.from(layerProps.image.data.slice(0, 4))).toEqual([0, 0, 0, 0]);
  });

  it("uses an OrthographicView and initial zoom that fits the wavefront extent", () => {
    render(<WavefrontMapChart wavefrontMapData={wavefrontMapData} />);

    expect(mockOrthographicView).toHaveBeenCalledWith(expect.objectContaining({
      id: "wavefront-map-view",
      flipY: false,
      controller: true,
    }));
    expect(mockDeckGL).toHaveBeenLastCalledWith(expect.objectContaining({
      views: [expect.objectContaining({ id: "orthographic-view" })],
      viewState: expect.objectContaining({
        "wavefront-map-view": expect.objectContaining({
          target: [0, 0, 0],
          zoom: expect.closeTo(Math.log2(192 / (2 * 1 * 1.12))),
        }),
      }),
    }));
  });

  it("keeps DeckGL view state controlled under the wavefront map view id after panning", () => {
    render(<WavefrontMapChart wavefrontMapData={wavefrontMapData} />);

    const deckProps = mockDeckGL.mock.lastCall?.[0] as MockDeckGLProps;
    act(() => {
      deckProps.onViewStateChange?.({
        viewState: {
          target: [0.5, -0.5, 0],
          zoom: Math.log2(192 / 2),
        },
      });
    });

    expect(mockDeckGL).toHaveBeenLastCalledWith(expect.objectContaining({
      viewState: {
        "wavefront-map-view": {
          target: [0.5, -0.5, 0],
          zoom: Math.log2(192 / 2),
        },
      },
    }));
  });

  it("updates x and y tick labels from the panned and zoomed orthographic viewport", () => {
    render(<WavefrontMapChart wavefrontMapData={wavefrontMapData} />);

    const deckProps = mockDeckGL.mock.lastCall?.[0] as MockDeckGLProps;
    act(() => {
      deckProps.onViewStateChange?.({
        viewState: {
          target: [0.5, -0.5, 0],
          zoom: Math.log2(192 / 2),
        },
      });
    });

    expect(screen.getAllByText("-1.5").length).toBeGreaterThan(0);
    expect(screen.getAllByText("-0.5").length).toBeGreaterThan(0);
    expect(screen.getAllByText("0.5").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1.5").length).toBeGreaterThan(0);
  });

  it("displays axis labels, theme-aware ticks, and a waves color bar", () => {
    render(<WavefrontMapChart wavefrontMapData={wavefrontMapData} />);

    expect(screen.getByText("x (pupil)")).toHaveAttribute("fill", "currentColor");
    expect(screen.getByText("y (pupil)")).toHaveAttribute("fill", "currentColor");
    expect(screen.getByText("waves")).toHaveAttribute("fill", "currentColor");
    expect(screen.getByText("0.5")).toHaveAttribute("fill", "currentColor");
    expect(screen.getByText("0.1")).toHaveAttribute("fill", "currentColor");
  });

  it("uses a square auto-height chart when requested", () => {
    render(<WavefrontMapChart wavefrontMapData={wavefrontMapData} autoHeight />);

    expect(screen.getByTestId("wavefront-map-chart")).toHaveStyle({
      width: "400px",
      height: "400px",
    });
  });
});
