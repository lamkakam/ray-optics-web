import { buildLongitudinalSphericalAberrationOption } from "@/features/analysis/components/LongitudinalSphericalAberrationChart";
import { globalTokens } from "@/shared/tokens/styleTokens";
import type { LongitudinalSphericalAberrationData } from "@/features/analysis/types/plotData";

jest.mock("echarts/core", () => ({
  use: jest.fn(),
}), { virtual: true });

jest.mock("echarts/charts", () => ({
  LineChart: {},
}), { virtual: true });

jest.mock("echarts/components", () => ({
  GridComponent: {},
  LegendComponent: {},
  TooltipComponent: {},
}), { virtual: true });

jest.mock("echarts/renderers", () => ({
  CanvasRenderer: {},
}), { virtual: true });

describe("longitudinalSphericalAberrationChartOption", () => {
  const lsaData: LongitudinalSphericalAberrationData = [
    {
      wvlIdx: 0,
      LSA: { x: [0, -0.02, -0.08], y: [0, 0.5, 1] },
      unitX: "mm",
      unitY: "",
    },
    {
      wvlIdx: 1,
      LSA: { x: [0, -0.01, -0.05], y: [0, 0.5, 1] },
      unitX: "mm",
      unitY: "",
    },
  ];

  it("builds numeric axes with one symbol-free line per wavelength", () => {
    const option = buildLongitudinalSphericalAberrationOption(
      lsaData,
      ["486.1nm", "587.6nm"],
      480,
      320,
      globalTokens.echarts.text.light,
    );

    expect(option.tooltip.axisPointer).toEqual({ type: "cross" });
    expect(option.xAxis.type).toBe("value");
    expect(option.xAxis.name).toBe("Longitudinal Focus Shift (mm)");
    expect(option.yAxis.type).toBe("value");
    expect(option.yAxis.name).toBe("Normalized Pupil Coordinate");
    expect(option.xAxis.splitLine).toEqual({
      show: true,
      lineStyle: { color: "#d1d5db", width: 1, type: "solid" },
    });
    expect(option.yAxis.splitLine).toEqual({
      show: true,
      lineStyle: { color: "#d1d5db", width: 1, type: "solid" },
    });
    expect(option.series).toEqual([
      expect.objectContaining({
        name: "486.1nm",
        type: "line",
        showSymbol: false,
        data: [[0, 0], [-0.02, 0.5], [-0.08, 1]],
      }),
      expect.objectContaining({
        name: "587.6nm",
        type: "line",
        showSymbol: false,
        data: [[0, 0], [-0.01, 0.5], [-0.05, 1]],
      }),
    ]);
  });

  it("reserves extra top space for wrapped wavelength legends and reduces grid height", () => {
    const sixWavelengthLsaData: LongitudinalSphericalAberrationData = Array.from({ length: 6 }, (_, index) => ({
      wvlIdx: index,
      LSA: { x: [0, -0.02, -0.08], y: [0, 0.5, 1] },
      unitX: "mm",
      unitY: "",
    }));

    const option = buildLongitudinalSphericalAberrationOption(
      sixWavelengthLsaData,
      ["486.1 nm", "500.0 nm", "532.0 nm", "587.6 nm", "610.0 nm", "656.3 nm"],
      320,
      400,
      globalTokens.echarts.text.light,
    );

    expect(option.legend).toEqual(expect.objectContaining({ left: 72, right: 28 }));
    expect(option.grid).toEqual(expect.objectContaining({
      top: 84,
      height: 260,
    }));
  });
});
