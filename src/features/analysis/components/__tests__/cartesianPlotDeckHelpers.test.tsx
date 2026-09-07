import { render } from "@testing-library/react";
import {
  buildCartesianTicks,
  CartesianSvgOverlay,
  getInitialOrthographicZoom,
  getVisibleAxisDomains,
  hexToRgb,
} from "@/features/analysis/components/cartesianPlotDeckHelpers";

describe("cartesian plot helpers", () => {
  it("rejects either non-positive zoom input and keeps the positive fit formula", () => {
    expect(getInitialOrthographicZoom(0, 1)).toBe(0);
    expect(getInitialOrthographicZoom(100, 0)).toBe(0);
    expect(getInitialOrthographicZoom(-100, 1)).toBe(0);
    expect(getInitialOrthographicZoom(100, -1)).toBe(0);
    expect(getInitialOrthographicZoom(224, 100)).toBeCloseTo(0);
  });

  it("converts colors, visible domains, and five evenly spaced ticks", () => {
    expect(hexToRgb("#12aBc3")).toEqual([18, 171, 195]);
    expect(getVisibleAxisDomains(100, { target: [4, -2, 0], zoom: 1 })).toEqual({
      x: { min: -21, max: 29 },
      y: { min: -27, max: 23 },
    });
    expect(getVisibleAxisDomains(100, { target: [4, -2, 0], zoom: Number.NEGATIVE_INFINITY })).toEqual({
      x: { min: 4, max: 4 },
      y: { min: -2, max: -2 },
    });
    expect(buildCartesianTicks({ min: -2, max: 2 })).toEqual([-2, -1, 0, 1, 2]);
  });

  it("renders a color bar only when all color-bar data is available", () => {
    const layout = { plotSide: 120, plotLeft: 20, plotTop: 10, yAxisLabelX: 0 };
    const baseProps = {
      height: 180,
      layout,
      xAxisTicks: [-1, 0, 1],
      yAxisTicks: [-1, 0, 1],
      xAxisLabel: "x",
      yAxisLabel: "y",
    } as const;

    const { rerender, container } = render(
      <CartesianSvgOverlay
        {...baseProps}
        colorBarId="flux"
        palette={["#000000", "#ffffff"]}
        colorBarTopLabel="1"
        colorBarBottomLabel="0"
        colorBarTitle="Flux"
      />,
    );
    expect(container.querySelector("linearGradient")).not.toBeNull();

    rerender(<CartesianSvgOverlay {...baseProps} colorBarId="flux" palette={["#000000", "#ffffff"]} colorBarTopLabel="1" />);
    expect(container.querySelector("linearGradient")).toBeNull();

    rerender(
      <CartesianSvgOverlay
        {...baseProps}
        colorBarId="flux"
        palette={["#000000", "#ffffff"]}
        colorBarTopLabel="1"
        colorBarBottomLabel="0"
      />,
    );
    expect(container.querySelector("linearGradient")).toBeNull();

    rerender(
      <CartesianSvgOverlay
        {...baseProps}
        colorBarId="flux"
        palette={["#000000"]}
        colorBarTopLabel="1"
        colorBarBottomLabel="0"
        colorBarTitle="Flux"
      />,
    );
    expect(container.querySelector("linearGradient")).toBeNull();

    rerender(
      <CartesianSvgOverlay
        {...baseProps}
        palette={["#000000", "#ffffff"]}
        colorBarTopLabel="1"
        colorBarBottomLabel="0"
        colorBarTitle="Flux"
      />,
    );
    expect(container.querySelector("linearGradient")).toBeNull();

    rerender(
      <CartesianSvgOverlay
        {...baseProps}
        colorBarId="flux"
        palette={["#000000", "#ffffff"]}
        colorBarTopLabel="1"
        colorBarBottomLabel="0"
        colorBarTitle="Flux"
      />,
    );
    expect(container.querySelector("linearGradient")).not.toBeNull();
    expect(container.querySelectorAll("stop")).toHaveLength(2);
  });
});
