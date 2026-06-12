import * as echarts from "echarts/core";
import { buildAstigmatismOption } from "@/features/analysis/components/AstigmatismChart";
import { globalTokens } from "@/shared/tokens/styleTokens";
import type { AstigmatismCurveData } from "@/features/analysis/types/plotData";

jest.mock("echarts/core", () => ({
  use: jest.fn(),
}), { virtual: true });

jest.mock("echarts/charts", () => ({
  LineChart: {},
}), { virtual: true });

jest.mock("echarts/components", () => ({
  GridComponent: { component: "grid" },
  LegendComponent: { component: "legend" },
  TooltipComponent: { component: "tooltip" },
}), { virtual: true });

jest.mock("echarts/renderers", () => ({
  CanvasRenderer: {},
}), { virtual: true });

describe("astigmatismChartOption", () => {
  const astigmatismCurveData: AstigmatismCurveData = {
    wvlIdx: 1,
    Astigmatism: { x: [0.1, 0, -0.1], y: [0, 1, 2] },
    fieldLabels: ["0", "10", "20"],
    unitX: "mm",
    unitY: "deg",
  };

  it("builds exactly one astigmatism line series", () => {
    const option = buildAstigmatismOption(
      astigmatismCurveData,
      480,
      320,
      globalTokens.echarts.text.light,
    );

    expect(option.yAxis.data).toEqual(astigmatismCurveData.fieldLabels);
    expect(option.series).toEqual([
      expect.objectContaining({
        name: "Astigmatism",
        type: "line",
        showSymbol: false,
        data: [[0.1, 0], [0, 1], [-0.1, 2]],
      }),
    ]);
  });

  it("does not emit a legend option or register the legend component", () => {
    const option = buildAstigmatismOption(
      astigmatismCurveData,
      480,
      320,
      globalTokens.echarts.text.light,
    );

    expect(option).not.toHaveProperty("legend");
    expect(echarts.use).toHaveBeenCalledWith(expect.not.arrayContaining([
      { component: "legend" },
    ]));
  });
});
