import { buildSurfaceBySurface3rdOrderChartOption } from "@/features/analysis/components/surfaceBySurface3rdOrderChartOption";
import type { SeidelSurfaceBySurfaceData } from "@/shared/lib/types/opticalModel";

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
    );

    expect(option.legend.data).toEqual(["S-I", "S-II", "S-III", "S-IV", "S-V"]);
    expect(option.series).toHaveLength(5);
    expect(option.series.map((series: { name: string }) => series.name)).toEqual([
      "S-I",
      "S-II",
      "S-III",
      "S-IV",
      "S-V",
    ]);
  });

  it("uses a cross axis pointer tooltip", () => {
    const option = buildSurfaceBySurface3rdOrderChartOption(
      surfaceBySurface3rdOrderData,
      960,
      540,
    );

    expect(option.tooltip).toMatchObject({
      trigger: "axis",
      axisPointer: {
        type: "cross",
      },
    });
  });

  it("uses surface labels as x-axis categories and row-wise series data", () => {
    const option = buildSurfaceBySurface3rdOrderChartOption(
      surfaceBySurface3rdOrderData,
      960,
      540,
    );

    expect(option.xAxis.data).toEqual(["S1", "S2", "sum"]);
    expect(option.series[0].data).toEqual([0.1, 0.2, 0.3]);
    expect(option.series[4].data).toEqual([1.0, 1.1, 2.1]);
  });
});
