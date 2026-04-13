import {
  buildDiffractionPsfOption,
  formatDiffractionPsfIntensity,
} from "@/features/analysis/components/diffraction-psf-chart/diffractionPsfChartOption";
import { ANALYSIS_HEATMAP_COLOR_PALETTE } from "@/features/analysis/components/analysisChartPalette";
import { globalTokens } from "@/shared/tokens/styleTokens";
import type { DiffractionPsfData } from "@/shared/lib/types/opticalModel";

jest.mock("echarts/core", () => ({
  use: jest.fn(),
}), { virtual: true });

jest.mock("echarts/charts", () => ({
  ScatterChart: {},
}), { virtual: true });

jest.mock("echarts/components", () => ({
  GridComponent: {},
  TooltipComponent: {},
  VisualMapComponent: {},
}), { virtual: true });

jest.mock("echarts/renderers", () => ({
  CanvasRenderer: {},
}), { virtual: true });

describe("diffractionPsfChartOption", () => {
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

  it("formats the visual map labels back to intensity values", () => {
    expect(formatDiffractionPsfIntensity(Math.log10(1))).toBe("1");
    expect(formatDiffractionPsfIntensity(Math.log10(5e-4))).toBe("0.0005");
    expect(formatDiffractionPsfIntensity(-8)).toBe("1e-8");
  });

  it("builds the expected scatter option for the diffraction PSF chart", () => {
    const option = buildDiffractionPsfOption(
      diffractionPsfData,
      400,
      400,
      globalTokens.echarts.text.light,
    );

    expect(option.tooltip).toEqual({
      trigger: "none",
      axisPointer: {
        type: "cross",
      },
    });
    expect(option.xAxis.min).toBe(-0.02);
    expect(option.xAxis.max).toBe(0.02);
    expect(option.xAxis.nameTextStyle).toEqual({ color: globalTokens.echarts.text.light });
    expect(option.xAxis.axisLabel).toEqual(expect.objectContaining({ color: globalTokens.echarts.text.light }));
    expect(option.yAxis.min).toBe(-0.02);
    expect(option.yAxis.max).toBe(0.02);
    expect(option.yAxis.nameTextStyle).toEqual({ color: globalTokens.echarts.text.light });
    expect(option.yAxis.axisLabel).toEqual(expect.objectContaining({ color: globalTokens.echarts.text.light }));
    expect(option.grid.width).toBe(option.grid.height);
    expect(option.grid.width).toBe(168);
    expect(option.grid.right).toBe(160);
    expect(option.series).toHaveLength(1);
    expect(option.series[0].type).toBe("scatter");
    expect(option.series[0].data).toContainEqual([-0.02, -0.01, Math.log10(5e-4)]);
    expect(option.series[0].data).toContainEqual([0, 0, 0]);
    expect(option.visualMap.min).toBeCloseTo(Math.log10(5e-4));
    expect(option.visualMap.right).toBe(16);
    expect(option.visualMap.top).toBe(16);
    expect(option.visualMap.textStyle).toEqual({ color: globalTokens.echarts.text.light });
    expect(option.visualMap.text).toEqual(["1", "0.0005"]);
    expect(option.visualMap.formatter(Math.log10(1))).toBe("1");
    expect(option.visualMap.formatter(Math.log10(5e-4))).toBe("0.0005");
    expect(option.visualMap.inRange.color).toEqual(ANALYSIS_HEATMAP_COLOR_PALETTE);
  });

  it("caps the visual map height when the chart is short", () => {
    const option = buildDiffractionPsfOption(
      diffractionPsfData,
      600,
      96,
      globalTokens.echarts.text.light,
    );

    expect(option.visualMap.itemHeight).toBe(64);
    expect(option.visualMap.itemHeight).toBeLessThanOrEqual(96);
    expect(option.visualMap.top).toBe(16);
  });

  it("clamps sub-1e-9 rounded axis extents to 0", () => {
    const option = buildDiffractionPsfOption(
      {
        ...diffractionPsfData,
        x: [-1e-10, 0, 1e-10],
        y: [-1e-10, 0, 1e-10],
      },
      400,
      400,
      globalTokens.echarts.text.light,
    );

    expect(option.xAxis.min).toBe(0);
    expect(option.xAxis.max).toBe(0);
    expect(option.yAxis.min).toBe(0);
    expect(option.yAxis.max).toBe(0);
  });
});
