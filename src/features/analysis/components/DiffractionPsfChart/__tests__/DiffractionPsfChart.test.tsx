import { act, render, screen } from "@testing-library/react";
import { DiffractionPsfChart } from "@/features/analysis/components/DiffractionPsfChart";
import type { DiffractionPsfData } from "@/features/analysis/types/plotData";

const mockDeckGL = jest.fn(({ children }: { readonly children?: React.ReactNode }) => (
  <div data-testid="deck-gl">{children}</div>
));
const mockGridLayer = jest.fn((props: unknown) => ({ id: "grid-layer", props }));
const mockOrthographicView = jest.fn((props: unknown) => ({ id: "orthographic-view", props }));

jest.mock("deck.gl", () => ({
  COORDINATE_SYSTEM: {
    CARTESIAN: "cartesian",
  },
  DeckGL: (props: { readonly children?: React.ReactNode }) => mockDeckGL(props),
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
    };
    expect(layerProps.data).toHaveLength(9);
    expect(layerProps.getPosition({ x: 0.02, y: -0.01 })).toEqual([0.02, -0.01]);
    expect(layerProps.getColorWeight({ logScaledFlux: -3 })).toBe(-3);
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

  it("displays axis labels, ticks, and the normalized flux color-bar label", () => {
    render(<DiffractionPsfChart diffractionPsfData={diffractionPsfData} />);

    expect(screen.getByText("x (mm)")).toBeInTheDocument();
    expect(screen.getByText("y (mm)")).toBeInTheDocument();
    expect(screen.getByText("Normalized flux/bin")).toBeInTheDocument();
    expect(screen.getAllByText("-0.02").length).toBeGreaterThan(0);
    expect(screen.getAllByText("0").length).toBeGreaterThan(0);
    expect(screen.getAllByText("0.02").length).toBeGreaterThan(0);
  });

  it("uses theme-aware currentColor fills for SVG overlay text", () => {
    render(<DiffractionPsfChart diffractionPsfData={diffractionPsfData} />);

    expect(screen.getByText("x (mm)")).toHaveAttribute("fill", "currentColor");
    expect(screen.getByText("y (mm)")).toHaveAttribute("fill", "currentColor");
    expect(screen.getByText("Normalized flux/bin")).toHaveAttribute("fill", "currentColor");

    for (const tickLabel of screen.getAllByText("-0.02")) {
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
