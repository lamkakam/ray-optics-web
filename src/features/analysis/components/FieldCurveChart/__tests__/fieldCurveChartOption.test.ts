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
    expect(option.xAxis.splitLine).toEqual({
      show: true,
      lineStyle: {
        color: "#d1d5db",
        width: 1,
        type: "solid",
      },
    });
    expect(option.yAxis.type).toBe("category");
    expect(option.yAxis.data).toEqual(fieldCurveData.fieldLabels);
    expect(option.yAxis.splitLine).toEqual({
      show: true,
      interval: option.yAxis.axisLabel.interval,
      lineStyle: {
        color: "#d1d5db",
        width: 1,
        type: "solid",
      },
    });
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

  it("limits y-axis labels, ticks, and split lines to five evenly distributed categories", () => {
    const denseFieldCurveData: FieldCurveData = {
      ...fieldCurveData,
      Sagittal: { x: [-0.1, 0, 0.1], y: [0, 4, 8] },
      Tangential: { x: [-0.2, 0, 0.2], y: [0, 4, 8] },
      fieldLabels: ["0", "5", "10", "15", "20", "25", "30", "35", "40"],
    };

    const option = buildFieldCurveOption(
      denseFieldCurveData,
      480,
      320,
      globalTokens.echarts.text.light,
    );

    const isVisibleCategory = option.yAxis.axisLabel.interval;
    const visibleIndices = denseFieldCurveData.fieldLabels
      .map((_, index) => index)
      .filter((index) => isVisibleCategory(index));

    expect(visibleIndices).toEqual([0, 2, 4, 6, 8]);
    expect(option.yAxis.axisTick).toEqual({ interval: isVisibleCategory });
    expect(option.yAxis.splitLine).toEqual({
      show: true,
      interval: isVisibleCategory,
      lineStyle: {
        color: "#d1d5db",
        width: 1,
        type: "solid",
      },
    });
  });

  it("shows every y-axis category when fewer than five field labels exist", () => {
    const sparseFieldCurveData: FieldCurveData = {
      ...fieldCurveData,
      fieldLabels: ["0", "10", "20", "30"],
    };

    const option = buildFieldCurveOption(
      sparseFieldCurveData,
      480,
      320,
      globalTokens.echarts.text.light,
    );

    const isVisibleCategory = option.yAxis.axisLabel.interval;

    expect(sparseFieldCurveData.fieldLabels.every((_, index) => isVisibleCategory(index))).toBe(true);
    expect(option.yAxis.axisTick).toEqual({ interval: isVisibleCategory });
    expect(option.yAxis.splitLine).toEqual({
      show: true,
      interval: isVisibleCategory,
      lineStyle: {
        color: "#d1d5db",
        width: 1,
        type: "solid",
      },
    });
  });
});
