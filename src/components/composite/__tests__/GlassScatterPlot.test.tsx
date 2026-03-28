import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GlassScatterPlot } from "@/components/composite/GlassScatterPlot";
import type { PlotPoint, SelectedGlass } from "@/lib/glassMap";

const glassData = {
  refractiveIndexD: 1.5168,
  refractiveIndexE: 1.519,
  abbeNumberD: 64.17,
  abbeNumberE: 63.96,
  dispersionCoefficients: {},
  partialDispersions: { P_g_F: 0.5349 },
};

const points: PlotPoint[] = [
  { x: 64.17, y: 1.5168, catalogName: "Schott", glassName: "N-BK7", data: glassData },
  { x: 36.43, y: 1.6200, catalogName: "Schott", glassName: "N-F2", data: { ...glassData, refractiveIndexD: 1.62, abbeNumberD: 36.43 } },
];

const defaultProps = {
  points,
  selectedGlass: undefined as SelectedGlass | undefined,
  xAxisLabel: "Vd",
  yAxisLabel: "Nd",
  onPointClick: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

describe("GlassScatterPlot", () => {
  it("renders an SVG element", () => {
    const { container } = render(<GlassScatterPlot {...defaultProps} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders glass-point elements for each point", () => {
    render(<GlassScatterPlot {...defaultProps} />);
    const circles = screen.getAllByTestId("glass-point");
    expect(circles.length).toBe(2);
  });

  it("calls onPointClick with SelectedGlass when a point is clicked", async () => {
    render(<GlassScatterPlot {...defaultProps} />);
    const circles = screen.getAllByTestId("glass-point");
    await userEvent.click(circles[0]);
    expect(defaultProps.onPointClick).toHaveBeenCalledTimes(1);
    const arg = defaultProps.onPointClick.mock.calls[0][0] as SelectedGlass;
    expect(arg.glassName).toBeDefined();
    expect(arg.catalogName).toBeDefined();
  });

  it("renders x-axis label", () => {
    render(<GlassScatterPlot {...defaultProps} />);
    expect(screen.getByText("Vd")).toBeInTheDocument();
  });

  it("renders y-axis label", () => {
    render(<GlassScatterPlot {...defaultProps} />);
    expect(screen.getByText("Nd")).toBeInTheDocument();
  });

  it("y-axis tick values are in ascending order from bottom to top (lower position = lower nd)", () => {
    const { container } = render(<GlassScatterPlot {...defaultProps} yDomainMin={1.4} yDomainMax={2.0} />);

    const axisLeft = container.querySelector(".visx-axis-left");
    expect(axisLeft).not.toBeNull();

    const ticks = axisLeft!.querySelectorAll(".visx-axis-tick");
    expect(ticks.length).toBeGreaterThan(1);

    const tickData = Array.from(ticks).map((tick) => {
      const textEl = tick.querySelector("text");
      const value = parseFloat(textEl?.textContent ?? "0");
      // visx renders each tick's y-position in the text element's y attribute
      const yPos = parseFloat(textEl?.getAttribute("y") ?? "0");
      return { value, yPos };
    });

    // Lower nd value → higher SVG y coordinate (appears lower on screen)
    const sorted = [...tickData].sort((a, b) => a.value - b.value);
    for (let i = 0; i < sorted.length - 1; i++) {
      expect(sorted[i].yPos).toBeGreaterThan(sorted[i + 1].yPos);
    }

    // Range must cover the data (points have nd 1.5168 and 1.62); forced min=1.4, max=2.0
    const values = tickData.map((t) => t.value);
    expect(Math.min(...values)).toBeLessThan(1.5); // ~1.4 lower bound
    expect(Math.max(...values)).toBeGreaterThan(1.9); // ~2.0 upper bound
    expect(Math.max(...values)).toBeLessThan(2.2); // not in buggy 2.x-2.9 range
  });

  it("y-axis tick max is not forced to 2.0 when no yDomainMax prop is given (partial dispersion data)", () => {
    const pdPoints: PlotPoint[] = [
      { x: 64.17, y: 0.5349, catalogName: "Schott", glassName: "N-BK7", data: glassData },
      { x: 36.43, y: 0.5828, catalogName: "Schott", glassName: "N-F2", data: { ...glassData, refractiveIndexD: 1.62, abbeNumberD: 36.43 } },
    ];
    const { container } = render(<GlassScatterPlot {...defaultProps} points={pdPoints} />);
    const axisLeft = container.querySelector(".visx-axis-left");
    expect(axisLeft).not.toBeNull();
    const ticks = axisLeft!.querySelectorAll(".visx-axis-tick");
    const values = Array.from(ticks).map((t) => parseFloat(t.querySelector("text")?.textContent ?? "0"));
    expect(Math.max(...values)).toBeLessThan(0.9);
  });

  it("y-axis with yDomainMin and yDomainMax respects the forced bounds", () => {
    const { container } = render(
      <GlassScatterPlot {...defaultProps} yDomainMin={1.4} yDomainMax={2.0} />
    );
    const axisLeft = container.querySelector(".visx-axis-left");
    expect(axisLeft).not.toBeNull();
    const ticks = axisLeft!.querySelectorAll(".visx-axis-tick");
    const values = Array.from(ticks).map((t) => parseFloat(t.querySelector("text")?.textContent ?? "0"));
    expect(Math.min(...values)).toBeLessThan(1.5);
    expect(Math.max(...values)).toBeGreaterThan(1.9);
  });

  it("axis line and tick strokes use currentColor for dark mode support", () => {
    const { container } = render(<GlassScatterPlot {...defaultProps} />);
    const axisBottom = container.querySelector(".visx-axis-bottom");
    const axisLeft = container.querySelector(".visx-axis-left");
    expect(axisBottom?.querySelector(".visx-axis-line")?.getAttribute("stroke")).toBe("currentColor");
    expect(axisLeft?.querySelector(".visx-axis-line")?.getAttribute("stroke")).toBe("currentColor");
  });

  it("axis tick labels use currentColor fill for dark mode support", () => {
    const { container } = render(<GlassScatterPlot {...defaultProps} />);
    const axisLeft = container.querySelector(".visx-axis-left");
    const firstTickText = axisLeft?.querySelector(".visx-axis-tick text");
    expect(firstTickText?.getAttribute("fill")).toBe("currentColor");
  });
});
