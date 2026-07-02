import { ANALYSIS_HEATMAP_COLOR_PALETTE } from "@/features/analysis/lib/analysisChartPalette";
import { buildWavefrontMapBitmap } from "@/features/analysis/components/WavefrontMapChart/wavefrontMapDeckData";
import type { WavefrontMapData } from "@/features/analysis/types/plotData";

function hexToRgba(hexColor: string, alpha: number): readonly [number, number, number, number] {
  return [
    Number.parseInt(hexColor.slice(1, 3), 16),
    Number.parseInt(hexColor.slice(3, 5), 16),
    Number.parseInt(hexColor.slice(5, 7), 16),
    alpha,
  ];
}

describe("wavefrontMapDeckData", () => {
  const wavefrontMapData: WavefrontMapData = {
    fieldIdx: 0,
    wvlIdx: 0,
    x: [-1, 0, 1],
    y: [-2, 0, 2],
    z: [
      [undefined, 0.1, undefined],
      [0.2, 0.3, 0.4],
      [undefined, 0.5, undefined],
    ],
    unitX: "",
    unitY: "",
    unitZ: "waves",
  };

  it("builds a linear RGBA bitmap with transparent pixels for missing samples", () => {
    const prepared = buildWavefrontMapBitmap(wavefrontMapData);

    expect(prepared.image.width).toBe(3);
    expect(prepared.image.height).toBe(3);
    expect(prepared.minValue).toBe(0.1);
    expect(prepared.maxValue).toBe(0.5);
    expect(prepared.bounds).toEqual([-1, -2, 1, 2]);
    expect(prepared.axisExtent).toBe(2);

    expect(Array.from(prepared.image.data.slice(0, 4))).toEqual([0, 0, 0, 0]);
    expect(Array.from(prepared.image.data.slice(4, 8))).toEqual(hexToRgba(ANALYSIS_HEATMAP_COLOR_PALETTE[0], 255));
    expect(Array.from(prepared.image.data.slice(16, 20))).toEqual(hexToRgba(ANALYSIS_HEATMAP_COLOR_PALETTE[5], 255));
    expect(Array.from(prepared.image.data.slice(28, 32))).toEqual(hexToRgba(ANALYSIS_HEATMAP_COLOR_PALETTE[10], 255));
  });

  it("keeps equal finite values stable without NaN color indexing", () => {
    const prepared = buildWavefrontMapBitmap({
      ...wavefrontMapData,
      x: [0],
      y: [0],
      z: [[0.25]],
    });

    expect(prepared.minValue).toBe(0.25);
    expect(prepared.maxValue).toBe(0.25);
    expect(Array.from(prepared.image.data)).toEqual(hexToRgba(ANALYSIS_HEATMAP_COLOR_PALETTE[0], 255));
  });

  it("interpolates finite values between neighboring palette stops", () => {
    const prepared = buildWavefrontMapBitmap({
      ...wavefrontMapData,
      x: [0, 1, 2],
      y: [0],
      z: [[0, 0.05, 1]],
    });

    expect(Array.from(prepared.image.data.slice(4, 8))).toEqual([91, 52, 144, 255]);
    expect(Array.from(prepared.image.data.slice(4, 8))).not.toEqual(hexToRgba(ANALYSIS_HEATMAP_COLOR_PALETTE[0], 255));
    expect(Array.from(prepared.image.data.slice(4, 8))).not.toEqual(hexToRgba(ANALYSIS_HEATMAP_COLOR_PALETTE[1], 255));
  });
});
