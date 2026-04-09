import { buildSpotDiagramOption } from "@/features/analysis/components/spotDiagramChartOption";
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
    const option = buildSpotDiagramOption(spotDiagramData, ["486.1 nm", "587.6 nm", "656.3 nm"], 400, 400);

    expect(option.legend?.data).toEqual(["486.1 nm", "656.3 nm"]);
    expect(option.series).toHaveLength(2);
    expect(option.series[0]).toEqual(expect.objectContaining({
      type: "scatter",
      name: "486.1 nm",
      symbolSize: 3,
    }));
    expect(option.series[1]).toEqual(expect.objectContaining({
      type: "scatter",
      name: "656.3 nm",
      symbolSize: 3,
    }));
  });

  it("uses distinct colors, no visualMap, and cross axis pointer", () => {
    const option = buildSpotDiagramOption(spotDiagramData, ["486.1 nm", "587.6 nm", "656.3 nm"], 400, 400);

    expect("visualMap" in option).toBe(false);
    expect(option.tooltip).toEqual({
      trigger: "none",
      axisPointer: {
        type: "cross",
      },
    });
    expect(option.series[0]?.itemStyle?.color).not.toBe(option.series[1]?.itemStyle?.color);
  });

  it("uses symmetric axes covering every wavelength group", () => {
    const option = buildSpotDiagramOption(spotDiagramData, ["486.1 nm", "587.6 nm", "656.3 nm"], 600, 300);

    expect(option.xAxis).toEqual(expect.objectContaining({
      min: -0.03,
      max: 0.03,
      name: "x (mm)",
    }));
    expect(option.yAxis).toEqual(expect.objectContaining({
      min: -0.03,
      max: 0.03,
      name: "y (mm)",
    }));
    expect(option.grid).toEqual(expect.objectContaining({
      width: 196,
      height: 196,
    }));
  });
});
