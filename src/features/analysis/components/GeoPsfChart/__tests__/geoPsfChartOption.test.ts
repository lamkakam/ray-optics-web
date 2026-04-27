import { buildGeoPsfOption } from "@/features/analysis/components/GeoPsfChart";
import { globalTokens } from "@/shared/tokens/styleTokens";
import type { GeoPsfData } from "@/features/analysis/types/plotData";

jest.mock("echarts/core", () => ({
  use: jest.fn(),
}), { virtual: true });

jest.mock("echarts/charts", () => ({
  ScatterChart: {},
}), { virtual: true });

jest.mock("echarts/components", () => ({
  GridComponent: {},
  TooltipComponent: {},
}), { virtual: true });

jest.mock("echarts/renderers", () => ({
  CanvasRenderer: {},
}), { virtual: true });

describe("geoPsfChartOption", () => {
  const geoPsfData: GeoPsfData = {
    fieldIdx: 0,
    wvlIdx: 0,
    x: [-0.02, 0, 0.02],
    y: [-0.01, 0, 0.01],
    unitX: "mm",
    unitY: "mm",
  };

  it("builds the expected scatter option for the geometric PSF chart", () => {
    const option = buildGeoPsfOption(geoPsfData, 400, 400, globalTokens.echarts.text.light);

    expect(option.tooltip).toEqual({
      trigger: "none",
      axisPointer: {
        type: "cross",
      },
    });
    expect("visualMap" in option).toBe(false);
    expect(option.xAxis.min).toBe(-0.02);
    expect(option.xAxis.max).toBe(0.02);
    expect(option.xAxis.nameTextStyle).toEqual({ color: globalTokens.echarts.text.light });
    expect(option.xAxis.axisLabel).toEqual(expect.objectContaining({ color: globalTokens.echarts.text.light }));
    expect(option.xAxis.axisLabel.formatter(5e-5)).toBe("5e-5");
    expect(option.yAxis.min).toBe(-0.02);
    expect(option.yAxis.max).toBe(0.02);
    expect(option.yAxis.nameTextStyle).toEqual({ color: globalTokens.echarts.text.light });
    expect(option.yAxis.axisLabel).toEqual(expect.objectContaining({ color: globalTokens.echarts.text.light }));
    expect(option.yAxis.axisLabel.formatter(-5e-5)).toBe("-5e-5");
    expect(option.grid.width).toBe(option.grid.height);
    expect(option.series).toHaveLength(1);
    expect(option.series[0].type).toBe("scatter");
    expect(option.series[0].symbolSize).toBe(1);
    expect(option.series[0].itemStyle.color).toBe("#5470c6");
    expect(option.series[0].data).toEqual([
      [-0.02, -0.01],
      [0, 0],
      [0.02, 0.01],
    ]);
  });

  it("clamps sub-1e-9 rounded axis extents to 0", () => {
    const option = buildGeoPsfOption(
      {
        ...geoPsfData,
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
