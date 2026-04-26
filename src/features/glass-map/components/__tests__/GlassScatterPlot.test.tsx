import { fireEvent, render, screen } from "@testing-library/react";
import {
  GlassScatterPlot,
  computePinchDelta,
  computeRenderedCircleStyle,
  isSingleTouchGesture,
} from "@/features/glass-map/components/GlassScatterPlot";
import type { PlotPoint, SelectedGlass } from "@/features/glass-map/types/glassMap";

const glassData = {
  refractiveIndexD: 1.5168,
  refractiveIndexE: 1.519,
  abbeNumberD: 64.17,
  abbeNumberE: 63.96,
  partialDispersions: { P_g_F: 0.5349, P_F_d: 0.41, P_F_e: 0.4 },
  dispersionCoeffKind: "Sellmeier3T" as const,
  dispersionCoeffs: [
    1.03961212,
    0.231792344,
    1.01046945,
    0.00600069867,
    0.0200179144,
    103.560653,
  ],
};

const points: PlotPoint[] = [
  { x: 64.17, y: 1.5168, catalogName: "Schott", glassName: "N-BK7", data: glassData },
  {
    x: 36.43,
    y: 1.62,
    catalogName: "Schott",
    glassName: "N-F2",
    data: { ...glassData, refractiveIndexD: 1.62, abbeNumberD: 36.43 },
  },
];

const defaultProps = {
  points,
  selectedGlass: undefined as SelectedGlass | undefined,
  xAxisLabel: "Vd",
  yAxisLabel: "Nd",
  onPointClick: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GlassScatterPlot", () => {
  it("renders a single interaction surface without a separate touch wrapper", () => {
    render(<GlassScatterPlot {...defaultProps} />);

    expect(screen.getByTestId("glass-scatter-interaction-surface")).toBeInTheDocument();
    expect(screen.queryByTestId("glass-scatter-touch-surface")).not.toBeInTheDocument();
  });

  it("renders an SVG element", () => {
    const { container } = render(<GlassScatterPlot {...defaultProps} />);

    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("applies touch-action none on the main svg container for mobile pinch handling", () => {
    const { container } = render(<GlassScatterPlot {...defaultProps} />);
    const svg = container.querySelector("svg") as SVGSVGElement | null;

    expect(svg?.style.touchAction).toBe("none");
  });

  it("renders glass points for each point", () => {
    render(<GlassScatterPlot {...defaultProps} />);

    expect(screen.getAllByTestId("glass-point")).toHaveLength(2);
  });

  it("calls onPointClick with SelectedGlass when a point is clicked", () => {
    render(<GlassScatterPlot {...defaultProps} />);

    fireEvent.click(screen.getAllByTestId("glass-point")[0]);

    expect(defaultProps.onPointClick).toHaveBeenCalledTimes(1);
    expect(defaultProps.onPointClick).toHaveBeenCalledWith({
      catalogName: "Schott",
      glassName: "N-BK7",
      data: glassData,
    });
  });

  it("renders axis labels", () => {
    render(<GlassScatterPlot {...defaultProps} />);

    expect(screen.getByText("Vd")).toBeInTheDocument();
    expect(screen.getByText("Nd")).toBeInTheDocument();
  });

  it("uses currentColor for axis strokes and labels", () => {
    const { container } = render(<GlassScatterPlot {...defaultProps} />);
    const axisBottom = container.querySelector(".visx-axis-bottom");
    const axisLeft = container.querySelector(".visx-axis-left");

    expect(axisBottom?.querySelector(".visx-axis-line")?.getAttribute("stroke")).toBe("currentColor");
    expect(axisLeft?.querySelector(".visx-axis-line")?.getAttribute("stroke")).toBe("currentColor");
    expect(axisLeft?.querySelector(".visx-axis-tick text")?.getAttribute("fill")).toBe("currentColor");
  });

  it("renders zoom-aligned grid rows and columns", () => {
    const { container } = render(<GlassScatterPlot {...defaultProps} />);

    expect(container.querySelector(".visx-rows")).toBeInTheDocument();
    expect(container.querySelector(".visx-columns")).toBeInTheDocument();
  });

  it("shows tooltip with glass name on mouse hover", () => {
    render(<GlassScatterPlot {...defaultProps} />);

    fireEvent.mouseEnter(screen.getAllByTestId("glass-point")[0]);

    expect(screen.getByText("N-BK7")).toBeInTheDocument();
  });

  it("renders crosshair lines when a glass is selected", () => {
    const selectedGlass: SelectedGlass = {
      catalogName: "Schott",
      glassName: "N-BK7",
      data: glassData,
    };
    const { container } = render(
      <GlassScatterPlot {...defaultProps} selectedGlass={selectedGlass} />
    );

    expect(container.querySelector("[data-testid='crosshair-h']")).toBeInTheDocument();
    expect(container.querySelector("[data-testid='crosshair-v']")).toBeInTheDocument();
  });

  it("does not render crosshair lines when no glass is selected", () => {
    const { container } = render(<GlassScatterPlot {...defaultProps} />);

    expect(container.querySelector("[data-testid='crosshair-h']")).not.toBeInTheDocument();
    expect(container.querySelector("[data-testid='crosshair-v']")).not.toBeInTheDocument();
  });

  it("keeps the apparent circle size constant while applying the zoom transform to position", () => {
    expect(
      computeRenderedCircleStyle({
        cx: 120,
        cy: 180,
        isSelected: false,
        transformMatrix: { scaleX: 2, scaleY: 2, translateX: 30, translateY: -10 },
      })
    ).toEqual({
      cx: 270,
      cy: 350,
      r: 4,
      strokeWidth: 0,
    });

    expect(
      computeRenderedCircleStyle({
        cx: 120,
        cy: 180,
        isSelected: true,
        transformMatrix: { scaleX: 2, scaleY: 2, translateX: 30, translateY: -10 },
      })
    ).toEqual({
      cx: 270,
      cy: 350,
      r: 6,
      strokeWidth: 1.5,
    });
  });

  it("uses damped pinch zoom steps instead of the visx default step size", () => {
    expect(
      computePinchDelta({
        offset: [120, 0],
        lastOffset: [100, 0],
      })
    ).toEqual({
      scaleX: 1.03,
      scaleY: 1.03,
    });

    expect(
      computePinchDelta({
        offset: [80, 0],
        lastOffset: [100, 0],
      })
    ).toEqual({
      scaleX: 0.97,
      scaleY: 0.97,
    });
  });

  it("treats only one-finger touch gestures as drag interactions", () => {
    expect(isSingleTouchGesture(1)).toBe(true);
    expect(isSingleTouchGesture(2)).toBe(false);
    expect(isSingleTouchGesture(3)).toBe(false);
  });

  it("respects explicit y-domain bounds for refractive-index plots", () => {
    const { container } = render(
      <GlassScatterPlot {...defaultProps} yDomainMin={1.4} yDomainMax={2.0} />
    );
    const axisLeft = container.querySelector(".visx-axis-left");
    const ticks = axisLeft?.querySelectorAll(".visx-axis-tick") ?? [];
    const values = Array.from(ticks).map((tick) =>
      parseFloat(tick.querySelector("text")?.textContent ?? "0")
    );

    expect(Math.min(...values)).toBeLessThan(1.5);
    expect(Math.max(...values)).toBeGreaterThan(1.9);
    expect(Math.max(...values)).toBeLessThan(2.2);
  });

  it("uses a data-driven y-domain when no max override is provided", () => {
    const pdPoints: PlotPoint[] = [
      { x: 64.17, y: 0.5349, catalogName: "Schott", glassName: "N-BK7", data: glassData },
      {
        x: 36.43,
        y: 0.5828,
        catalogName: "Schott",
        glassName: "N-F2",
        data: { ...glassData, refractiveIndexD: 1.62, abbeNumberD: 36.43 },
      },
    ];
    const { container } = render(<GlassScatterPlot {...defaultProps} points={pdPoints} />);
    const axisLeft = container.querySelector(".visx-axis-left");
    const ticks = axisLeft?.querySelectorAll(".visx-axis-tick") ?? [];
    const values = Array.from(ticks).map((tick) =>
      parseFloat(tick.querySelector("text")?.textContent ?? "0")
    );

    expect(Math.max(...values)).toBeLessThan(0.9);
  });
});
