import { buildYYbarChartOption } from "@/features/analysis/components/YYbarChart";
import { globalTokens } from "@/shared/tokens/styleTokens";
import type { YYbarData } from "@/features/analysis/types/plotData";

jest.mock(
  "echarts/core",
  () => ({
    use: jest.fn(),
  }),
  { virtual: true },
);

jest.mock(
  "echarts/charts",
  () => ({
    LineChart: {},
  }),
  { virtual: true },
);

jest.mock(
  "echarts/components",
  () => ({
    GridComponent: {},
    TooltipComponent: {},
  }),
  { virtual: true },
);

jest.mock(
  "echarts/renderers",
  () => ({
    CanvasRenderer: {},
  }),
  { virtual: true },
);

describe("yYbarChartOption", () => {
  const yYbarData: YYbarData = {
    surfaceLabels: ["1", "2", "3", "Img"],
    y: [6.25, 5.9, undefined, 0.03],
    yBar: [-4.19, -3.22, 0, 18.12],
    unit: "mm",
  };

  function build(data: YYbarData = yYbarData) {
    return buildYYbarChartOption(
      data,
      480,
      320,
      globalTokens.echarts.text.light,
    );
  }

  it("draws one unsmoothed line through the surfaces in sequence with ȳ on x and y on y", () => {
    const option = build();

    expect(option.series).toHaveLength(1);
    expect(option.series[0]).toEqual(
      expect.objectContaining({
        type: "line",
        smooth: false,
        data: [
          [-4.19, 6.25],
          [-3.22, 5.9],
          [0, "-"],
          [18.12, 0.03],
        ],
      }),
    );
  });

  it("names both axes with the system length unit", () => {
    const option = build();

    expect(option.xAxis.name).toBe("ȳ (mm)");
    expect(option.yAxis.name).toBe("y (mm)");
    expect(build({ ...yYbarData, unit: "" }).xAxis.name).toBe("ȳ");
  });

  it("labels each point with its surface label", () => {
    const option = build();
    const formatter = option.series[0].label.formatter;

    expect(option.series[0].label.show).toBe(true);
    expect(formatter({ dataIndex: 0 })).toBe("1");
    expect(formatter({ dataIndex: 3 })).toBe("Img");
  });

  it("shows the surface label and both heights in the tooltip", () => {
    const option = build();

    expect(option.tooltip.formatter({ dataIndex: 1 })).toBe(
      "Surface 2<br/>y: 5.9 mm<br/>ȳ: -3.22 mm",
    );
    expect(option.tooltip.formatter({ dataIndex: 3 })).toBe(
      "Img<br/>y: 0.03 mm<br/>ȳ: 18.12 mm",
    );
    expect(option.tooltip.formatter({ dataIndex: 2 })).toBe(
      "Surface 3<br/>y: n/a<br/>ȳ: 0 mm",
    );
  });
});
