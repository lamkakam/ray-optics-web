import { ANALYSIS_HEATMAP_COLOR_PALETTE } from "@/features/analysis/components/analysisChartPalette";
import { buildWavefrontMapOption } from "@/features/analysis/components/wavefrontMapChartOption";
import type { WavefrontMapData } from "@/shared/lib/types/opticalModel";

jest.mock("echarts/core", () => ({
  use: jest.fn(),
}), { virtual: true });

jest.mock("echarts/charts", () => ({
  HeatmapChart: {},
}), { virtual: true });

jest.mock("echarts/components", () => ({
  GridComponent: {},
  TooltipComponent: {},
  VisualMapComponent: {},
}), { virtual: true });

jest.mock("echarts/renderers", () => ({
  CanvasRenderer: {},
}), { virtual: true });

describe("wavefrontMapChartOption", () => {
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
    unitX: "",
    unitY: "",
    unitZ: "waves",
  };

  it("builds a linear heatmap option for the wavefront map", () => {
    const option = buildWavefrontMapOption(wavefrontMapData, 400, 400);

    expect(option.tooltip.axisPointer.type).toBe("cross");
    expect(option.tooltip.axisPointer.label.formatter({
      axisDimension: "x",
      value: 0.1234,
    })).toBe("0.12");
    expect(option.tooltip.axisPointer.label.formatter({
      axisDimension: "y",
      value: 12.34,
    })).toBe("12");
    expect(option.xAxis.type).toBe("category");
    expect(option.xAxis.data).toEqual([-1, 0, 1]);
    expect(option.xAxis.name).toBe("x");
    expect(option.xAxis.axisLabel.formatter(0.1234)).toBe("0.12");
    expect(option.yAxis.type).toBe("category");
    expect(option.yAxis.data).toEqual([-1, 0, 1]);
    expect(option.yAxis.name).toBe("y");
    expect(option.yAxis.axisLabel.formatter(0.1234)).toBe("0.12");
    expect(option.visualMap.min).toBe(0.1);
    expect(option.visualMap.max).toBe(0.5);
    expect(option.visualMap.inRange.color).toBe(ANALYSIS_HEATMAP_COLOR_PALETTE);
    expect(option.visualMap.formatter(0.3)).toBe("0.30");
    expect(option.series[0].type).toBe("heatmap");
    expect(option.series[0].data).toContainEqual([0, 1, 0.2]);
    expect(option.series[0].data).toContainEqual([2, 1, 0.4]);
    expect(option.series[0].data).not.toContainEqual([0, 0, undefined]);
  });

  it("uses the worker units in axis and visual-map labels when available", () => {
    const option = buildWavefrontMapOption(
      {
        ...wavefrontMapData,
        unitX: "pupil",
        unitY: "pupil",
        unitZ: "waves",
      },
      400,
      400,
    );

    expect(option.xAxis.name).toBe("x (pupil)");
    expect(option.yAxis.name).toBe("y (pupil)");
    expect(option.visualMap.text).toEqual(["waves", ""]);
  });

  it("keeps the plot square inside the available chart area", () => {
    const option = buildWavefrontMapOption(wavefrontMapData, 600, 300);

    expect(option.grid.width).toBe(option.grid.height);
  });
});
