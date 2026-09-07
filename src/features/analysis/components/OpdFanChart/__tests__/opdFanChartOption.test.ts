import { ANALYSIS_HEATMAP_COLOR_PALETTE } from "@/features/analysis/lib/analysisChartPalette";
import { buildOpdFanChartOption } from "@/features/analysis/components/OpdFanChart";
import { globalTokens } from "@/shared/tokens/styleTokens";
import type { OpdFanData } from "@/features/analysis/types/plotData";

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
    expect(yAxisLabel0.formatter(1e-8)).toBe("1e-8");
  });

  it("keeps tangential and sagittal subplots side-by-side by default", () => {
    const option = buildOpdFanChartOption(
      opdFanData,
      ["486.1 nm", "587.6 nm", "656.3 nm"],
      800,
      400,
      globalTokens.echarts.text.light,
    );

    expect(option.grid[0]).toEqual(expect.objectContaining({
      left: 60,
      top: 72,
      width: 332,
      height: 276,
    }));
    expect(option.grid[1]).toEqual(expect.objectContaining({
      left: 440,
      top: 72,
      width: 332,
      height: 276,
    }));
    expect(option.title[0]).toEqual(expect.objectContaining({ top: 40, left: 226 }));
    expect(option.title[1]).toEqual(expect.objectContaining({ top: 40, left: 606 }));
  });

  it("stacks tangential above sagittal subplots on small screens", () => {
    const option = buildOpdFanChartOption(
      opdFanData,
      ["486.1 nm", "587.6 nm", "656.3 nm"],
      800,
      600,
      globalTokens.echarts.text.light,
      true,
    );

    expect(option.grid[0]).toEqual(expect.objectContaining({
      left: 60,
      top: 72,
      width: 712,
      height: 186,
    }));
    expect(option.grid[1]).toEqual(expect.objectContaining({
      left: 60,
      top: 362,
      width: 712,
      height: 186,
    }));
    expect(option.title[0]).toEqual(expect.objectContaining({ top: 40, left: 416 }));
    expect(option.title[1]).toEqual(expect.objectContaining({ top: 330, left: 416 }));
    expect(Number(option.title[1]?.top) - (Number(option.grid[0]?.top) + Number(option.grid[0]?.height))).toBe(72);
  });

  it("reserves extra top space for wrapped wavelength legends on narrow small screens", () => {
    const sixWavelengthOpdFanData: OpdFanData = Array.from({ length: 6 }, (_, index) => ({
      fieldIdx: 0,
      wvlIdx: index,
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
    }));

    const option = buildOpdFanChartOption(
      sixWavelengthOpdFanData,
      ["486.1 nm", "500.0 nm", "532.0 nm", "587.6 nm", "610.0 nm", "656.3 nm"],
      320,
      600,
      globalTokens.echarts.text.light,
      true,
    );

    expect(option.legend).toEqual(expect.objectContaining({ left: 60, right: 28 }));
    expect(option.title[0]).toEqual(expect.objectContaining({ top: 88 }));
    expect(option.grid[0]).toEqual(expect.objectContaining({ top: 120, height: 162 }));
    expect(option.title[1]).toEqual(expect.objectContaining({ top: 354 }));
    expect(option.grid[1]).toEqual(expect.objectContaining({ top: 386, height: 162 }));
    expect(Number(option.title[1]?.top) - (Number(option.grid[0]?.top) + Number(option.grid[0]?.height))).toBe(72);
  });

  it("centers wide one-row wavelength legends over the plot band", () => {
    const sixWavelengthOpdFanData: OpdFanData = Array.from({ length: 6 }, (_, index) => ({
      fieldIdx: 0,
      wvlIdx: index,
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
    }));

    const option = buildOpdFanChartOption(
      sixWavelengthOpdFanData,
      ["486.1 nm", "500.0 nm", "532.0 nm", "587.6 nm", "610.0 nm", "656.3 nm"],
      800,
      400,
      globalTokens.echarts.text.light,
    );

    expect(option.legend).toEqual(expect.objectContaining({ left: 98, right: 66 }));
    expect(option.grid[0]).toEqual(expect.objectContaining({ top: 72 }));
  });

  it("rounds axis min and max values to 2 significant figures with independent subplot y ranges", () => {
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
      expect.objectContaining({ min: -0.00099, max: 0.0068 }),
      expect.objectContaining({ min: -0.99, max: 0.043 }),
    ]);
  });

  it("renders missing fan samples as line gaps instead of zero-valued points", () => {
    const option = buildOpdFanChartOption(
      [
        {
          fieldIdx: 0,
          wvlIdx: 0,
          Sagittal: {
            x: [-1, -0.5, 0, 0.5, 1],
            y: [-0.2, undefined, undefined, 0.1, 0.2],
          },
          Tangential: {
            x: [-1, -0.5, 0, 0.5, 1],
            y: [-0.1, undefined, undefined, 0.05, 0.1],
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

    expect(option.series[0]?.data).toEqual([
      [-1, -0.1],
      [-0.5, null],
      [0, null],
      [0.5, 0.05],
      [1, 0.1],
    ]);
    expect(option.series[1]?.data).toEqual([
      [-1, -0.2],
      [-0.5, null],
      [0, null],
      [0.5, 0.1],
      [1, 0.2],
    ]);
    expect(option.yAxis).toEqual([
      expect.objectContaining({ min: -0.1, max: 0.1 }),
      expect.objectContaining({ min: -0.2, max: 0.2 }),
    ]);
  });

  it("falls back only for a subplot with an empty or constant finite y range", () => {
    const option = buildOpdFanChartOption(
      [
        {
          fieldIdx: 0,
          wvlIdx: 0,
          Sagittal: {
            x: [-0.5, 0.5],
            y: [],
          },
          Tangential: {
            x: [-1, 1],
            y: [-0.04567, 0.1234],
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
      expect.objectContaining({ min: -1, max: 1 }),
      expect.objectContaining({ min: -1, max: 1 }),
    ]);
    expect(option.yAxis).toEqual([
      expect.objectContaining({ min: -0.046, max: 0.12 }),
      expect.objectContaining({ min: -0.000001, max: 0.000001 }),
    ]);
  });

  it("clamps sub-1e-9 rounded axis extents to 0", () => {
    const option = buildOpdFanChartOption(
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
          unitY: "waves",
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

  it("uses stable palette ordering when no wavelength label is numeric", () => {
    const option = buildOpdFanChartOption(
      opdFanData,
      ["reference", "unused", "primary"],
      800,
      400,
      globalTokens.echarts.text.light,
    );

    expect(option.series[0]?.lineStyle?.color).toBe(ANALYSIS_HEATMAP_COLOR_PALETTE[0]);
    expect(option.series[2]?.lineStyle?.color).toBe(ANALYSIS_HEATMAP_COLOR_PALETTE[1]);
  });

  it("uses the middle color for one numeric wavelength and preserves fallback colors for unknown labels", () => {
    const option = buildOpdFanChartOption(
      opdFanData,
      ["587.6 nm", "unused", "unknown"],
      800,
      400,
      globalTokens.echarts.text.light,
    );

    const middleColor = ANALYSIS_HEATMAP_COLOR_PALETTE[Math.floor((ANALYSIS_HEATMAP_COLOR_PALETTE.length - 1) / 2)];
    expect(option.series[0]?.lineStyle?.color).toBe(middleColor);
    expect(option.series[2]?.lineStyle?.color).toBe(ANALYSIS_HEATMAP_COLOR_PALETTE[1]);
    expect(option.series[0]?.itemStyle?.color).toBe(middleColor);
    expect(option.series[2]?.itemStyle?.color).toBe(ANALYSIS_HEATMAP_COLOR_PALETTE[1]);
  });

  it("ignores non-finite samples and falls back for an invalid subplot range", () => {
    const option = buildOpdFanChartOption(
      [
        {
          fieldIdx: 0,
          wvlIdx: 0,
          Sagittal: { x: [Number.POSITIVE_INFINITY], y: [Number.POSITIVE_INFINITY] },
          Tangential: { x: [Number.NaN], y: [Number.NEGATIVE_INFINITY] },
          unitX: "",
          unitY: "waves",
        },
      ],
      ["587.6 nm"],
      800,
      400,
      globalTokens.echarts.text.light,
    );

    expect(option.xAxis).toEqual([
      expect.objectContaining({ min: -1, max: 1 }),
      expect.objectContaining({ min: -1, max: 1 }),
    ]);
    expect(option.yAxis).toEqual([
      expect.objectContaining({ min: -0.000001, max: 0.000001 }),
      expect.objectContaining({ min: -0.000001, max: 0.000001 }),
    ]);
  });

  it("uses the default unit label when no OPD samples exist", () => {
    const option = buildOpdFanChartOption([], [], 800, 400, globalTokens.echarts.text.light);

    expect(option.legend?.data).toEqual([]);
    expect(option.yAxis[0]?.name).toBe("waves");
    expect(option.series).toEqual([]);
  });

  it("parses integer and multi-digit decimal wavelength labels for color ordering", () => {
    const option = buildOpdFanChartOption(
      opdFanData.concat({
        ...opdFanData[0],
        wvlIdx: 1,
      }),
      ["1000", "1000.02 nm", "1000.04 nm"],
      800,
      400,
      globalTokens.echarts.text.light,
    );

    expect(option.series[0]?.lineStyle?.color).toBe(ANALYSIS_HEATMAP_COLOR_PALETTE[0]);
    expect(option.series[2]?.lineStyle?.color).toBe(ANALYSIS_HEATMAP_COLOR_PALETTE[10]);
    expect(option.series[4]?.lineStyle?.color).toBe(ANALYSIS_HEATMAP_COLOR_PALETTE[5]);
  });

  it("uses the wavelength-index fallback label when a series index is missing", () => {
    const option = buildOpdFanChartOption(
      [{ ...opdFanData[0], wvlIdx: 4 }],
      [],
      800,
      400,
      globalTokens.echarts.text.light,
    );

    expect(option.legend?.data).toEqual(["Wavelength 4"]);
    expect(option.series[0]?.name).toBe("Wavelength 4");
  });

  it("uses a fallback color for an unknown label alongside an unequal numeric range", () => {
    const option = buildOpdFanChartOption(
      [
        { ...opdFanData[0], wvlIdx: 0 },
        { ...opdFanData[1], wvlIdx: 1 },
        { ...opdFanData[0], wvlIdx: 2 },
      ],
      ["486.1 nm", "656.3 nm", "unknown"],
      800,
      400,
      globalTokens.echarts.text.light,
    );

    expect(option.series[0]?.lineStyle?.color).toBe(ANALYSIS_HEATMAP_COLOR_PALETTE[0]);
    expect(option.series[2]?.lineStyle?.color).toBe(ANALYSIS_HEATMAP_COLOR_PALETTE[10]);
    expect(option.series[4]?.lineStyle?.color).toBe(ANALYSIS_HEATMAP_COLOR_PALETTE[2]);
  });

  it("falls back for a constant finite subplot range", () => {
    const option = buildOpdFanChartOption(
      [{
        ...opdFanData[0],
        Tangential: { x: [0, 1], y: [2, 2] },
        Sagittal: { x: [0, 1], y: [3, 3] },
      }],
      ["587.6 nm"],
      800,
      400,
      globalTokens.echarts.text.light,
    );

    expect(option.yAxis).toEqual([
      expect.objectContaining({ min: -0.000001, max: 0.000001 }),
      expect.objectContaining({ min: -0.000001, max: 0.000001 }),
    ]);
  });

  it("ignores non-finite samples when finite samples are also present", () => {
    const option = buildOpdFanChartOption(
      [{
        ...opdFanData[0],
        Tangential: { x: [0.1, 0.2, Number.POSITIVE_INFINITY], y: [0.2, 0.3, Number.POSITIVE_INFINITY] },
        Sagittal: { x: [-0.1, -0.2, Number.NEGATIVE_INFINITY], y: [-0.2, -0.3, Number.NEGATIVE_INFINITY] },
      }],
      ["587.6 nm"],
      800,
      400,
      globalTokens.echarts.text.light,
    );

    expect(option.xAxis).toEqual([
      expect.objectContaining({ min: -0.2, max: 0.2 }),
      expect.objectContaining({ min: -0.2, max: 0.2 }),
    ]);
    expect(option.yAxis).toEqual([
      expect.objectContaining({ min: 0.2, max: 0.3 }),
      expect.objectContaining({ min: -0.3, max: -0.2 }),
    ]);
  });
});
