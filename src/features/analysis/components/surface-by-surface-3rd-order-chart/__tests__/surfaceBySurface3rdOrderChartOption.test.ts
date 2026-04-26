import { buildSurfaceBySurface3rdOrderChartOption } from "@/features/analysis/components/surface-by-surface-3rd-order-chart/surfaceBySurface3rdOrderChartOption";
import { globalTokens } from "@/shared/tokens/styleTokens";
import type { SeidelSurfaceBySurfaceData } from "@/features/lens-editor/types/seidelData";

describe("buildSurfaceBySurface3rdOrderChartOption", () => {
  const surfaceBySurface3rdOrderData: SeidelSurfaceBySurfaceData = {
    aberrTypes: ["S-I", "S-II", "S-III", "S-IV", "S-V"],
    surfaceLabels: ["S1", "S2", "sum"],
    data: [
      [0.1, 0.2, 0.3],
      [0.4, 0.5, 0.9],
      [0.6, 0.7, 1.3],
      [0.8, 0.9, 1.7],
      [1.0, 1.1, 2.1],
    ],
  };

  it("builds five bar series with the S-I through S-V labels", () => {
    const option = buildSurfaceBySurface3rdOrderChartOption(
      surfaceBySurface3rdOrderData,
      960,
      540,
      globalTokens.echarts.text.light,
    );

    expect(option.legend.data).toEqual(["S-I", "S-II", "S-III", "S-IV", "S-V"]);
    expect(option.legend.textStyle).toEqual({ color: globalTokens.echarts.text.light });
    expect(option.series).toHaveLength(5);
    expect(option.series.map((series: { name: string }) => series.name)).toEqual([
      "S-I",
      "S-II",
      "S-III",
      "S-IV",
      "S-V",
    ]);
  });

  it("uses a shadow axis pointer tooltip", () => {
    const option = buildSurfaceBySurface3rdOrderChartOption(
      surfaceBySurface3rdOrderData,
      960,
      540,
      globalTokens.echarts.text.light,
    );

    expect(option.tooltip).toMatchObject({
      trigger: "axis",
      axisPointer: {
        type: "shadow",
      },
    });
  });

  it("formats tooltip values with 2 significant figures", () => {
    const option = buildSurfaceBySurface3rdOrderChartOption(
      surfaceBySurface3rdOrderData,
      960,
      540,
      globalTokens.echarts.text.light,
    );

    const formatter = option.tooltip.formatter as (
      params: Array<{ axisValueLabel: string; seriesName: string; value: number; marker: string }>
    ) => string;

    expect(
      formatter([
        {
          axisValueLabel: "S1",
          seriesName: "S-I",
          value: 0.1234,
          marker: "<span></span>",
        },
        {
          axisValueLabel: "S1",
          seriesName: "S-II",
          value: 987.6,
          marker: "<span></span>",
        },
      ]),
    ).toContain("0.12");
    expect(
      formatter([
        {
          axisValueLabel: "S1",
          seriesName: "S-I",
          value: 0.1234,
          marker: "<span></span>",
        },
        {
          axisValueLabel: "S1",
          seriesName: "S-II",
          value: 987.6,
          marker: "<span></span>",
        },
      ]),
    ).toContain("990");
    expect(
      formatter([
        {
          axisValueLabel: "S1",
          seriesName: "S-I",
          value: 1e-8,
          marker: "<span></span>",
        },
      ]),
    ).toContain("1e-8");
  });

  it("uses a larger category gap between surface groups", () => {
    const option = buildSurfaceBySurface3rdOrderChartOption(
      surfaceBySurface3rdOrderData,
      960,
      540,
      globalTokens.echarts.text.light,
    );

    expect(
      option.series.every((series: { barCategoryGap?: string }) => series.barCategoryGap === "60%"),
    ).toBe(true);
  });

  it("uses surface labels as x-axis categories and row-wise series data", () => {
    const option = buildSurfaceBySurface3rdOrderChartOption(
      surfaceBySurface3rdOrderData,
      960,
      540,
      globalTokens.echarts.text.light,
    );

    expect(option.xAxis.data).toEqual(["S1", "S2", "sum"]);
    expect(option.xAxis.nameTextStyle).toEqual({ color: globalTokens.echarts.text.light });
    expect(option.xAxis.axisLabel).toEqual(expect.objectContaining({ color: globalTokens.echarts.text.light }));
    expect(option.series[0].data).toEqual([0.1, 0.2, 0.3]);
    expect(option.series[4].data).toEqual([1.0, 1.1, 2.1]);
  });

  it("formats y-axis tick labels with at most 2 significant figures", () => {
    const option = buildSurfaceBySurface3rdOrderChartOption(
      surfaceBySurface3rdOrderData,
      960,
      540,
      globalTokens.echarts.text.light,
    );

    expect("title" in option).toBe(false);
    expect(option.yAxis.nameTextStyle).toEqual({ color: globalTokens.echarts.text.light });
    expect(option.yAxis.axisLabel).toEqual(expect.objectContaining({ color: globalTokens.echarts.text.light }));
    const formatter = option.yAxis.axisLabel.formatter as (value: number) => string;

    expect(formatter(0.1234)).toBe("0.12");
    expect(formatter(12.34)).toBe("12");
    expect(formatter(987.6)).toBe("990");
    expect(formatter(1e-8)).toBe("1e-8");
  });
});
