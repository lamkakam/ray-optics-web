import { ANALYSIS_HEATMAP_COLOR_PALETTE } from "@/features/analysis/lib/analysisChartPalette";
import { buildRayFanChartOption } from "@/features/analysis/components/RayFanChart";
import { globalTokens } from "@/shared/tokens/styleTokens";
import type { RayFanData } from "@/features/analysis/types/plotData";

describe("buildRayFanChartOption", () => {
  const rayFanData: RayFanData = [
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
      unitY: "mm",
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
      unitY: "mm",
    },
  ];

  it("builds tangential and sagittal line series with one shared legend entry per wavelength", () => {
    const option = buildRayFanChartOption(
      rayFanData,
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
    const option = buildRayFanChartOption(
      rayFanData,
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
    const option = buildRayFanChartOption(
      rayFanData,
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
    expect(option.xAxis).toEqual([
      expect.objectContaining({
        name: "Pupil Radius (Relative)",
        nameTextStyle: { color: globalTokens.echarts.text.light },
      }),
      expect.objectContaining({
        name: "Pupil Radius (Relative)",
        nameTextStyle: { color: globalTokens.echarts.text.light },
      }),
    ]);
    expect(option.yAxis).toEqual([
      expect.objectContaining({
        name: "Transverse Aberr. (mm)",
        nameTextStyle: { color: globalTokens.echarts.text.light },
      }),
      expect.objectContaining({
        name: "",
        nameTextStyle: { color: globalTokens.echarts.text.light },
      }),
    ]);
    expect(option.xAxis[0]?.axisLabel).toEqual(expect.objectContaining({ color: globalTokens.echarts.text.light }));
    expect(option.xAxis[1]?.axisLabel).toEqual(expect.objectContaining({ color: globalTokens.echarts.text.light }));
    expect(option.yAxis[0]?.axisLabel).toEqual(expect.objectContaining({ color: globalTokens.echarts.text.light }));
    expect(option.yAxis[1]?.axisLabel).toEqual(expect.objectContaining({ color: globalTokens.echarts.text.light }));
    expect(option.xAxis[0]?.axisLabel?.formatter(5e-5)).toBe("5e-5");
    expect(option.yAxis[0]?.axisLabel?.formatter(-5e-5)).toBe("-5e-5");
  });

  it("clamps sub-1e-9 rounded axis extents to 0", () => {
    const option = buildRayFanChartOption(
      [
        {
          fieldIdx: 0,
          wvlIdx: 0,
          Sagittal: {
            x: [-1e-10, 1e-10],
            y: [-1e-10, 1e-10],
          },
          Tangential: {
            x: [-1e-10, 1e-10],
            y: [-1e-10, 1e-10],
          },
          unitX: "",
          unitY: "mm",
        },
      ],
      ["486.1 nm"],
      800,
      400,
      globalTokens.echarts.text.light,
    );

    expect(option.xAxis).toEqual([
      expect.objectContaining({ min: 0, max: 0 }),
      expect.objectContaining({ min: 0, max: 0 }),
    ]);
    expect(option.yAxis).toEqual([
      expect.objectContaining({ min: 0, max: 0 }),
      expect.objectContaining({ min: 0, max: 0 }),
    ]);
  });
});
