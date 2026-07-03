import {
  DIFFRACTION_PSF_LOG_FLOOR,
  buildDiffractionPsfBitmap,
  formatDiffractionPsfFluxLabel,
} from "@/features/analysis/components/DiffractionPsfChart/diffractionPsfDeckData";
import { interpolateAnalysisHeatmapColor } from "@/features/analysis/lib/analysisChartPalette";
import type { DiffractionPsfData } from "@/features/analysis/types/plotData";

describe("diffractionPsfDeckData", () => {
  const diffractionPsfData: DiffractionPsfData = {
    fieldIdx: 0,
    wvlIdx: 0,
    x: [-0.02, 0, 0.02],
    y: [-0.01, 0, 0.01],
    z: [
      [0.0001, 0.001, 0.0001],
      [0.01, 1, 0.01],
      [0.0001, 0.001, 0.0001],
    ],
    unitX: "mm",
    unitY: "mm",
    unitZ: "",
  };

  it("uses 5e-4 as the normalized-flux log floor", () => {
    expect(formatDiffractionPsfFluxLabel(DIFFRACTION_PSF_LOG_FLOOR)).toBe("5e-4");
  });

  it("peak-normalizes positive flux across physical bins", () => {
    const prepared = buildDiffractionPsfBitmap(diffractionPsfData);

    expect(prepared.image.width).toBe(3);
    expect(prepared.image.height).toBe(3);
    expect(prepared.maxLogFlux).toBe(0);
    expect(prepared.minLogFlux).toBe(DIFFRACTION_PSF_LOG_FLOOR);
    expect(Array.from(prepared.image.data.slice(16, 20))).toEqual(
      interpolateAnalysisHeatmapColor(1),
    );
    expect(Array.from(prepared.image.data.slice(4, 8))).toEqual(
      interpolateAnalysisHeatmapColor((Math.log10(0.01) - DIFFRACTION_PSF_LOG_FLOOR) / -DIFFRACTION_PSF_LOG_FLOOR),
    );
    expect(Array.from(prepared.image.data.slice(0, 4))).toEqual(
      interpolateAnalysisHeatmapColor(0),
    );
  });

  it("keeps zero flux stable without NaN values", () => {
    const prepared = buildDiffractionPsfBitmap({
      ...diffractionPsfData,
      z: diffractionPsfData.z.map((row) => row.map(() => 0)),
    });

    expect(prepared.minLogFlux).toBe(DIFFRACTION_PSF_LOG_FLOOR);
    expect(prepared.maxLogFlux).toBe(DIFFRACTION_PSF_LOG_FLOOR);
    for (let pixelOffset = 0; pixelOffset < prepared.image.data.length; pixelOffset += 4) {
      expect(Array.from(prepared.image.data.slice(pixelOffset, pixelOffset + 4))).toEqual(
        interpolateAnalysisHeatmapColor(0),
      );
    }
  });

  it("maps below-floor, zero, missing, and negative flux samples to the log floor", () => {
    const prepared = buildDiffractionPsfBitmap({
      ...diffractionPsfData,
      x: [0, 1, 2, 3, 4],
      y: [0],
      z: [
        [1],
        [1e-4],
        [0],
        [],
        [-1],
      ],
    });

    expect(Array.from(prepared.image.data.slice(0, 4))).toEqual(
      interpolateAnalysisHeatmapColor(1),
    );
    for (let pixelOffset = 4; pixelOffset < prepared.image.data.length; pixelOffset += 4) {
      expect(Array.from(prepared.image.data.slice(pixelOffset, pixelOffset + 4))).toEqual(
        interpolateAnalysisHeatmapColor(0),
      );
    }
  });

  it("uses actual log10 values for normalized flux above the floor", () => {
    const prepared = buildDiffractionPsfBitmap({
      ...diffractionPsfData,
      x: [0, 1],
      y: [0],
      z: [
        [1],
        [1e-3],
      ],
    });

    expect(prepared.minLogFlux).toBeCloseTo(-3);
    expect(prepared.maxLogFlux).toBe(0);
    expect(Array.from(prepared.image.data.slice(4, 8))).toEqual(
      interpolateAnalysisHeatmapColor(0),
    );
  });

  it("derives bitmap bounds from median physical axis spacing", () => {
    const prepared = buildDiffractionPsfBitmap({
      ...diffractionPsfData,
      x: [-0.08, -0.02, 0.02, 0.08],
      y: [-0.03, -0.01, 0.01, 0.03],
      z: [
        [1, 1, 1, 1],
        [1, 1, 1, 1],
        [1, 1, 1, 1],
        [1, 1, 1, 1],
      ],
    });

    expect(prepared.bounds[0]).toBeCloseTo(-0.11);
    expect(prepared.bounds[1]).toBeCloseTo(-0.04);
    expect(prepared.bounds[2]).toBeCloseTo(0.11);
    expect(prepared.bounds[3]).toBeCloseTo(0.04);
  });

  it("uses rectangular physical edge bounds for axes with different spacing", () => {
    const prepared = buildDiffractionPsfBitmap(diffractionPsfData);

    expect(prepared.bounds).toEqual([-0.03, -0.015, 0.03, 0.015]);
  });

  it("writes the lowest physical y row into the bottom image row", () => {
    const prepared = buildDiffractionPsfBitmap({
      ...diffractionPsfData,
      x: [0],
      y: [-1, 0, 1],
      z: [
        [1, 0.01, 0.0001],
      ],
    });

    expect(Array.from(prepared.image.data.slice(0, 4))).toEqual(
      interpolateAnalysisHeatmapColor(0),
    );
    expect(Array.from(prepared.image.data.slice(8, 12))).toEqual(
      interpolateAnalysisHeatmapColor(1),
    );
  });

  it("formats log-scale labels back to normalized flux", () => {
    expect(formatDiffractionPsfFluxLabel(0)).toBe("1");
    expect(formatDiffractionPsfFluxLabel(Math.log10(5e-4))).toBe("5e-4");
    expect(formatDiffractionPsfFluxLabel(-8)).toBe("1e-8");
  });
});
