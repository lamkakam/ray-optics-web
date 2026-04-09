import { ANALYSIS_HEATMAP_COLOR_PALETTE } from "@/features/analysis/components/analysisChartPalette";
import { buildSpotDiagramOption } from "@/features/analysis/components/spotDiagramChartOption";
import { globalTokens } from "@/shared/tokens/styleTokens";
import type { SpotDiagramData } from "@/shared/lib/types/opticalModel";

describe("buildSpotDiagramOption", () => {
  const spotDiagramData: SpotDiagramData = [
    {
      fieldIdx: 0,
      wvlIdx: 0,
      x: [-0.02, 0, 0.02],
      y: [-0.01, 0, 0.01],
      unitX: "mm",
      unitY: "mm",
    },
    {
      fieldIdx: 0,
      wvlIdx: 2,
      x: [-0.03, 0, 0.03],
      y: [-0.015, 0, 0.015],
      unitX: "mm",
      unitY: "mm",
    },
  ];

  it("builds one scatter series per wavelength with legend labels based on real wavelengths", () => {
    const option = buildSpotDiagramOption(
      spotDiagramData,
      ["486.1 nm", "587.6 nm", "656.3 nm"],
      400,
      400,
      globalTokens.echarts.text.light,
    );

    expect(option.legend?.data).toEqual(["486.1 nm", "656.3 nm"]);
    expect(option.legend?.textStyle).toEqual({ color: globalTokens.echarts.text.light });
    expect(option.series).toHaveLength(2);
    expect(option.series[0]).toEqual(expect.objectContaining({
      type: "scatter",
      name: "486.1 nm",
      symbolSize: 5,
    }));
    expect(option.series[1]).toEqual(expect.objectContaining({
      type: "scatter",
      name: "656.3 nm",
      symbolSize: 5,
    }));
  });

  it("uses distinct colors, no visualMap, and cross axis pointer", () => {
    const option = buildSpotDiagramOption(
      spotDiagramData,
      ["486.1 nm", "587.6 nm", "656.3 nm"],
      400,
      400,
      globalTokens.echarts.text.light,
    );

    expect("visualMap" in option).toBe(false);
    expect(option.tooltip).toEqual({
      trigger: "none",
      axisPointer: {
        type: "cross",
      },
    });
    expect(option.series[0]?.itemStyle?.color).not.toBe(option.series[1]?.itemStyle?.color);
  });

  it("maps wavelength labels to the nearest shared heatmap colors", () => {
    const threeWavelengthSpotDiagramData: SpotDiagramData = [
      {
        fieldIdx: 0,
        wvlIdx: 0,
        x: [-0.02, 0, 0.02],
        y: [-0.01, 0, 0.01],
        unitX: "mm",
        unitY: "mm",
      },
      {
        fieldIdx: 0,
        wvlIdx: 1,
        x: [-0.025, 0, 0.025],
        y: [-0.012, 0, 0.012],
        unitX: "mm",
        unitY: "mm",
      },
      {
        fieldIdx: 0,
        wvlIdx: 2,
        x: [-0.03, 0, 0.03],
        y: [-0.015, 0, 0.015],
        unitX: "mm",
        unitY: "mm",
      },
    ];

    const option = buildSpotDiagramOption(
      threeWavelengthSpotDiagramData,
      ["486.1 nm", "587.6 nm", "656.3 nm"],
      400,
      400,
      globalTokens.echarts.text.light,
    );

    expect(option.series[0]?.itemStyle?.color).toBe(ANALYSIS_HEATMAP_COLOR_PALETTE[0]);
    expect(option.series[1]?.itemStyle?.color).toBe(ANALYSIS_HEATMAP_COLOR_PALETTE[6]);
    expect(option.series[2]?.itemStyle?.color).toBe(ANALYSIS_HEATMAP_COLOR_PALETTE[10]);
  });

  it("falls back to a stable palette color when a wavelength label is not numeric", () => {
    const option = buildSpotDiagramOption(
      spotDiagramData,
      ["Reference", "587.6 nm", "Primary"],
      400,
      400,
      globalTokens.echarts.text.light,
    );

    expect(option.series[0]?.itemStyle?.color).toBe(ANALYSIS_HEATMAP_COLOR_PALETTE[0]);
    expect(option.series[1]?.itemStyle?.color).toBe(ANALYSIS_HEATMAP_COLOR_PALETTE[1]);
  });

  it("uses symmetric axes covering every wavelength group", () => {
    const option = buildSpotDiagramOption(
      spotDiagramData,
      ["486.1 nm", "587.6 nm", "656.3 nm"],
      600,
      300,
      globalTokens.echarts.text.light,
    );

    expect(option.xAxis).toEqual(expect.objectContaining({
      min: -0.03,
      max: 0.03,
      name: "x (mm)",
      nameTextStyle: { color: globalTokens.echarts.text.light },
      axisLabel: { color: globalTokens.echarts.text.light },
    }));
    expect(option.yAxis).toEqual(expect.objectContaining({
      min: -0.03,
      max: 0.03,
      name: "y (mm)",
      nameTextStyle: { color: globalTokens.echarts.text.light },
      axisLabel: { color: globalTokens.echarts.text.light },
    }));
    expect(option.grid).toEqual(expect.objectContaining({
      width: 196,
      height: 196,
    }));
  });
});
