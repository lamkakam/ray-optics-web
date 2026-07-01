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

  it("uses 5e-4 as the normalized-flux log floor", () => {
    expect(formatDiffractionPsfFluxLabel(DIFFRACTION_PSF_LOG_FLOOR)).toBe("5e-4");
  });

  it("peak-normalizes positive flux across physical bins", () => {
    const prepared = buildDiffractionPsfBins(diffractionPsfData);

    expect(prepared.bins).toHaveLength(9);
    expect(Math.max(...prepared.bins.map((bin) => bin.normalizedFlux))).toBe(1);
    expect(prepared.bins.find((bin) => bin.x === 0 && bin.y === 0)?.normalizedFlux).toBeCloseTo(
      1,
    );
    expect(prepared.bins.find((bin) => bin.x === 0 && bin.y === -0.01)?.normalizedFlux).toBeCloseTo(
      0.01,
    );
    expect(prepared.bins.find((bin) => bin.x === -0.02 && bin.y === -0.01)?.normalizedFlux).toBeCloseTo(
      0.0001,
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

  it("maps below-floor, zero, missing, and negative flux samples to the log floor", () => {
    const prepared = buildDiffractionPsfBins({
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

    expect(prepared.bins[0]?.normalizedFlux).toBe(1);
    expect(prepared.bins[0]?.logScaledFlux).toBe(0);
    for (const bin of prepared.bins.slice(1)) {
      expect(bin.logScaledFlux).toBe(DIFFRACTION_PSF_LOG_FLOOR);
    }
  });

  it("uses actual log10 values for normalized flux above the floor", () => {
    const prepared = buildDiffractionPsfBins({
      ...diffractionPsfData,
      x: [0, 1],
      y: [0],
      z: [
        [1],
        [1e-3],
      ],
    });

    expect(prepared.bins[1]?.normalizedFlux).toBeCloseTo(1e-3);
    expect(prepared.bins[1]?.logScaledFlux).toBeCloseTo(-3);
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
