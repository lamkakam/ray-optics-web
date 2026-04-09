import { buildGeoPsfOption } from "@/features/analysis/components/geoPsfChartOption";
import type { GeoPsfData } from "@/shared/lib/types/opticalModel";

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
    const option = buildGeoPsfOption(geoPsfData, 400, 400);

    expect(option.tooltip).toEqual({
      trigger: "none",
      axisPointer: {
        type: "cross",
      },
    });
    expect("visualMap" in option).toBe(false);
    expect(option.xAxis.min).toBe(-0.02);
    expect(option.xAxis.max).toBe("0.020");
    expect(option.yAxis.min).toBe(-0.02);
    expect(option.yAxis.max).toBe("0.020");
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
});
