import { buildFieldCurveOption } from "@/features/analysis/components/FieldCurveChart";
import { globalTokens } from "@/shared/tokens/styleTokens";
import type { FieldCurveData } from "@/features/analysis/types/plotData";

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

describe("fieldCurveChartOption", () => {
  const fieldCurveData: FieldCurveData = {
    wvlIdx: 1,
    Sagittal: { x: [-0.1, 0, 0.1], y: [0, 1, 2] },
    Tangential: { x: [-0.2, 0, 0.2], y: [0, 1, 2] },
    fieldLabels: ["0", "10", "20"],
    unitX: "mm",
    unitY: "deg",
  };

  it("builds one category-y subplot with sagittal and tangential symbol-free lines", () => {
    const option = buildFieldCurveOption(
      fieldCurveData,
      480,
      320,
      globalTokens.echarts.text.light,
    );

    expect(Array.isArray(option.grid)).toBe(false);
    expect(Array.isArray(option.xAxis)).toBe(false);
    expect(Array.isArray(option.yAxis)).toBe(false);
    expect(option.xAxis.type).toBe("value");
    expect(option.yAxis.type).toBe("category");
    expect(option.yAxis.data).toEqual(fieldCurveData.fieldLabels);
    expect(option.tooltip.axisPointer).toEqual({ type: "cross" });
    expect(option.series).toHaveLength(2);
    expect(option.series).toEqual([
      expect.objectContaining({
        name: "Sagittal",
        type: "line",
        showSymbol: false,
        data: [[-0.1, 0], [0, 1], [0.1, 2]],
      }),
      expect.objectContaining({
        name: "Tangential",
        type: "line",
        showSymbol: false,
        data: [[-0.2, 0], [0, 1], [0.2, 2]],
      }),
    ]);
  });
});
