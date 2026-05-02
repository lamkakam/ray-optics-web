import { buildDiffractionMtfOption } from "@/features/analysis/components/DiffractionMtfChart";
import { globalTokens } from "@/shared/tokens/styleTokens";
import type { DiffractionMtfData } from "@/features/analysis/types/plotData";

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

describe("diffractionMtfChartOption", () => {
  const diffractionMtfData: DiffractionMtfData = {
    fieldIdx: 0,
    wvlIdx: 0,
    Tangential: { x: [0, 10, 20], y: [1, 0.7, 0.2] },
    Sagittal: { x: [0, 10, 20], y: [1, 0.65, 0.15] },
    IdealTangential: { x: [0, 10, 20], y: [1, 0.8, 0.3] },
    IdealSagittal: { x: [0, 10, 20], y: [1, 0.78, 0.28] },
    unitX: "cycles/mm",
    unitY: "",
    cutoffTangential: 42,
    cutoffSagittal: 40,
    naTangential: 0.012,
    naSagittal: 0.011,
  };

  it("builds four line series with measured solid curves and ideal dashed curves", () => {
    const option = buildDiffractionMtfOption(diffractionMtfData, 480, 320, globalTokens.echarts.text.light);

    expect(option.legend.data).toEqual(["Tangential", "Sagittal", "IdealTangential", "IdealSagittal"]);
    expect(option.xAxis.name).toBe("Spatial Frequency (cycles/mm)");
    expect(option.yAxis.name).toBe("MTF");
    expect(option.yAxis.min).toBe(0);
    expect(option.yAxis.max).toBe(1);
    expect(option.xAxis.axisLabel.formatter(5e-5)).toBe("5e-5");
    expect(option.yAxis.axisLabel.formatter(0.125)).toBe("0.13");
    expect(option.series).toHaveLength(4);
    expect(option.series[0]).toEqual(expect.objectContaining({
      name: "Tangential",
      type: "line",
      data: [[0, 1], [10, 0.7], [20, 0.2]],
      showSymbol: false,
    }));
    expect(option.series[0].lineStyle.type).toBe("solid");
    expect(option.series[1].lineStyle.type).toBe("solid");
    expect(option.series[2].lineStyle.type).toBe("dashed");
    expect(option.series[3].lineStyle.type).toBe("dashed");
  });

  it("raises the y-axis max when data exceeds normalized MTF", () => {
    const option = buildDiffractionMtfOption(
      {
        ...diffractionMtfData,
        Tangential: { x: [0, 10], y: [1.2, 0.9] },
      },
      480,
      320,
      globalTokens.echarts.text.light,
    );

    expect(option.yAxis.max).toBe(1.2);
  });
});
