import {
  DIFFRACTION_PSF_LOG_FLOOR,
  buildDiffractionPsfBins,
  formatDiffractionPsfFluxLabel,
} from "@/features/analysis/components/DiffractionPsfChart/diffractionPsfDeckData";
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

  it("normalizes total positive flux to one across physical bins", () => {
    const prepared = buildDiffractionPsfBins(diffractionPsfData);

    expect(prepared.bins).toHaveLength(9);
    expect(prepared.bins.reduce((sum, bin) => sum + bin.normalizedFlux, 0)).toBeCloseTo(1);
    expect(prepared.bins.find((bin) => bin.x === 0 && bin.y === 0)?.normalizedFlux).toBeCloseTo(
      1 / 1.0224,
    );
  });

  it("keeps zero flux stable without NaN values", () => {
    const prepared = buildDiffractionPsfBins({
      ...diffractionPsfData,
      z: diffractionPsfData.z.map((row) => row.map(() => 0)),
    });

    expect(prepared.bins.every((bin) => bin.normalizedFlux === 0)).toBe(true);
    expect(prepared.bins.every((bin) => Number.isFinite(bin.logScaledFlux))).toBe(true);
    expect(prepared.bins.every((bin) => bin.logScaledFlux === DIFFRACTION_PSF_LOG_FLOOR)).toBe(true);
  });

  it("derives cell size from the median positive physical axis spacing", () => {
    const prepared = buildDiffractionPsfBins({
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

    expect(prepared.cellSize).toBeCloseTo(0.02);
  });

  it("formats log-scale labels back to normalized flux", () => {
    expect(formatDiffractionPsfFluxLabel(0)).toBe("1");
    expect(formatDiffractionPsfFluxLabel(Math.log10(5e-4))).toBe("5e-4");
    expect(formatDiffractionPsfFluxLabel(-8)).toBe("1e-8");
  });
});
