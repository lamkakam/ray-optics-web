import { ANALYSIS_HEATMAP_COLOR_PALETTE } from "@/features/analysis/components/analysisChartPalette";
import { buildOpdFanChartOption } from "@/features/analysis/components/opd-fan-chart/opdFanChartOption";
import { globalTokens } from "@/shared/tokens/styleTokens";
import type { OpdFanData } from "@/shared/lib/types/opticalModel";

describe("buildOpdFanChartOption", () => {
  const opdFanData: OpdFanData = [
    {
      fieldIdx: 0,
      wvlIdx: 0,
      Sagittal: {
        x: [-1, 0, 1],
        y: [-0.2, 0, 0.2],
      },
      Tangential: {
        x: [-1, 0, 1],
        y: [-0.1, 0, 0.1],
      },
      unitX: "",
      unitY: "waves",
    },
    {
      fieldIdx: 0,
      wvlIdx: 2,
      Sagittal: {
        x: [-1, 0, 1],
        y: [-0.4, 0, 0.4],
      },
      Tangential: {
        x: [-1, 0, 1],
        y: [-0.3, 0, 0.3],
      },
      unitX: "",
      unitY: "waves",
    },
  ];

  it("builds tangential and sagittal line series with one shared legend entry per wavelength", () => {
    const option = buildOpdFanChartOption(
      opdFanData,
      ["486.1 nm", "587.6 nm", "656.3 nm"],
      800,
      400,
      globalTokens.echarts.text.light,
    );

    expect(option.legend?.data).toEqual(["486.1 nm", "656.3 nm"]);
    expect(option.series).toHaveLength(4);
    expect(option.series[0]).toEqual(expect.objectContaining({
      type: "line",
      name: "486.1 nm",
      xAxisIndex: 0,
      yAxisIndex: 0,
      showSymbol: false,
    }));
    expect(option.series[1]).toEqual(expect.objectContaining({
      type: "line",
      name: "486.1 nm",
      xAxisIndex: 1,
      yAxisIndex: 1,
      showSymbol: false,
    }));
  });

  it("uses a cross axis pointer, hides symbols, and assigns distinct colors per wavelength pair", () => {
    const option = buildOpdFanChartOption(
      opdFanData,
      ["486.1 nm", "587.6 nm", "656.3 nm"],
      800,
      400,
      globalTokens.echarts.text.light,
    );

    expect(option.tooltip).toEqual({
      trigger: "none",
      axisPointer: {
        type: "cross",
      },
    });
    expect(option.series.every((series) => series.showSymbol === false)).toBe(true);
    expect(option.series[0]?.lineStyle?.color).toBe(ANALYSIS_HEATMAP_COLOR_PALETTE[0]);
    expect(option.series[1]?.lineStyle?.color).toBe(ANALYSIS_HEATMAP_COLOR_PALETTE[0]);
    expect(option.series[2]?.lineStyle?.color).toBe(ANALYSIS_HEATMAP_COLOR_PALETTE[10]);
    expect(option.series[3]?.lineStyle?.color).toBe(ANALYSIS_HEATMAP_COLOR_PALETTE[10]);
  });

  it("creates separate subplot titles and axis labels", () => {
    const option = buildOpdFanChartOption(
      opdFanData,
      ["486.1 nm", "587.6 nm", "656.3 nm"],
      800,
      400,
      globalTokens.echarts.text.light,
    );

    expect(option.title).toEqual([
      expect.objectContaining({
        text: "Tangential",
        textStyle: { color: globalTokens.echarts.text.light },
      }),
      expect.objectContaining({
        text: "Sagittal",
        textStyle: { color: globalTokens.echarts.text.light },
      }),
    ]);
    expect(option.legend).toEqual(expect.objectContaining({
      textStyle: { color: globalTokens.echarts.text.light },
    }));
    expect(option.xAxis[0]).toEqual(expect.objectContaining({
      name: "Pupil Radius (Relative)",
      nameTextStyle: { color: globalTokens.echarts.text.light },
      axisLabel: expect.objectContaining({ color: globalTokens.echarts.text.light }),
    }));
    expect(option.xAxis[1]).toEqual(expect.objectContaining({
      name: "Pupil Radius (Relative)",
      nameTextStyle: { color: globalTokens.echarts.text.light },
      axisLabel: expect.objectContaining({ color: globalTokens.echarts.text.light }),
    }));
    expect(option.yAxis[0]).toEqual(expect.objectContaining({
      name: "waves",
      nameTextStyle: { color: globalTokens.echarts.text.light },
      axisLabel: expect.objectContaining({ color: globalTokens.echarts.text.light }),
    }));
    expect(option.yAxis[1]).toEqual(expect.objectContaining({
      name: "",
      nameTextStyle: { color: globalTokens.echarts.text.light },
      axisLabel: expect.objectContaining({ color: globalTokens.echarts.text.light }),
    }));

    const yAxisLabel0 = option.yAxis[0]?.axisLabel as unknown as { formatter: (value: number) => string };
    const yAxisLabel1 = option.yAxis[1]?.axisLabel as unknown as { formatter: (value: number) => string };
    expect(yAxisLabel0.formatter(0.1234)).toBe("0.12");
    expect(yAxisLabel1.formatter(12.34)).toBe("12");
  });

  it("rounds axis min and max values to 2 significant figures", () => {
    const option = buildOpdFanChartOption(
      [
        {
          fieldIdx: 0,
          wvlIdx: 0,
          Sagittal: {
            x: [-0.01234, 0.5678],
            y: [-0.9876, 0.04321],
          },
          Tangential: {
            x: [-0.004567, 1.234],
            y: [-0.0009876, 0.006789],
          },
          unitX: "",
          unitY: "waves",
        },
      ],
      ["486.1 nm"],
      800,
      400,
      globalTokens.echarts.text.light,
    );

    expect(option.xAxis).toEqual([
      expect.objectContaining({ min: -0.012, max: 1.2 }),
      expect.objectContaining({ min: -0.012, max: 1.2 }),
    ]);
    expect(option.yAxis).toEqual([
      expect.objectContaining({ min: -0.99, max: 0.043 }),
      expect.objectContaining({ min: -0.99, max: 0.043 }),
    ]);
  });
});
