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
});
