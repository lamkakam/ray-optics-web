/** Covers reference-based spectral radii, sample filtering, and unit compatibility. */
import { calculateSpotDiagramRadii } from "../calculateSpotDiagramRadii";
import type { SpotDiagramSeriesData } from "@/features/analysis/types/plotData";

const series = (
  overrides: Partial<SpotDiagramSeriesData> = {},
): SpotDiagramSeriesData => ({
  fieldIdx: 0,
  wvlIdx: 0,
  x: [3],
  y: [4],
  unitX: "µm",
  unitY: "µm",
  ...overrides,
});

describe("calculateSpotDiagramRadii", () => {
  it("measures from the supplied origin without recentering or rounding", () => {
    const result = calculateSpotDiagramRadii(
      [series({ x: [3, 1], y: [4, 1] })],
      [1],
    );
    expect(result).toEqual({
      geoRadius: 5,
      rmsRadius: Math.sqrt(13.5),
      unit: "µm",
    });
  });

  it("weights every ray by wvlIdx across unequal ray counts and reordered series", () => {
    const result = calculateSpotDiagramRadii(
      [
        series({ wvlIdx: 2, x: [0], y: [10] }),
        series({ wvlIdx: 0, x: [3, 0], y: [4, 0] }),
      ],
      [2, 100, 3],
    );
    expect(result?.geoRadius).toBe(10);
    expect(result?.rmsRadius).toBeCloseTo(Math.sqrt(350 / 7), 12);
  });

  it.each([0, -1, NaN, Infinity, -Infinity, undefined])(
    "excludes wavelengths with unusable weight %s from both radii",
    (weight) => {
      expect(
        calculateSpotDiagramRadii(
          [series(), series({ wvlIdx: 1, x: [1000], unitX: "unsupported" })],
          { 0: 1, 1: weight },
        ),
      ).toEqual({ geoRadius: 5, rmsRadius: 5, unit: "µm" });
    },
  );

  it("pairs coordinates by index and ignores nonfinite or unmatched entries", () => {
    expect(
      calculateSpotDiagramRadii(
        [
          series({ x: [3, NaN, 100, Infinity, 999], y: [4, 2, -Infinity, 1] }),
          series({ x: [0], y: [0, 999] }),
        ],
        [1],
      ),
    ).toEqual({ geoRadius: 5, rmsRadius: Math.sqrt(12.5), unit: "µm" });
  });

  it.each([[], [series({ x: [], y: [] })], [series({ x: [NaN] })]])(
    "returns undefined without usable pairs",
    (...data) => {
      expect(calculateSpotDiagramRadii(data, [1])).toBeUndefined();
    },
  );

  it("returns undefined without positive weights", () => {
    expect(calculateSpotDiagramRadii([series()], [0])).toBeUndefined();
    expect(calculateSpotDiagramRadii([series()], [])).toBeUndefined();
  });

  it.each<[string, number]>([
    ["m", 1e6],
    ["cm", 1e4],
    ["mm", 1e3],
    ["in", 25400],
    ["ft", 304800],
    ["nm", 0.001],
    ...[
      "µm",
      "μm",
      "um",
      "micron",
      "microns",
      "micrometer",
      "micrometers",
      "micrometre",
      "micrometres",
    ].map((unit): [string, number] => [unit, 1]),
  ])("converts %s to micrometres", (unit, scale) => {
    const result = calculateSpotDiagramRadii(
      [series({ unitX: unit, unitY: unit })],
      [1],
    );
    expect(result?.unit).toBe("µm");
    expect(result?.geoRadius).toBeCloseTo(5 * scale, 10);
    expect(result?.rmsRadius).toBeCloseTo(5 * scale, 10);
  });

  it("converts each physical axis and series independently", () => {
    expect(
      calculateSpotDiagramRadii(
        [
          series({ x: [0.003], y: [4000], unitX: "mm", unitY: "nm" }),
          series({ x: [0], y: [0.000005], unitX: "cm", unitY: "m" }),
        ],
        [1],
      ),
    ).toEqual({ geoRadius: 5, rmsRadius: 5, unit: "µm" });
  });

  it("preserves afocal arcseconds", () => {
    expect(
      calculateSpotDiagramRadii(
        [series({ unitX: "arcsec", unitY: "arcsec" })],
        [1],
      ),
    ).toEqual({ geoRadius: 5, rmsRadius: 5, unit: "arcsec" });
  });

  it.each([
    [series({ unitX: "unknown" })],
    [series({ unitY: "" })],
    [series({ unitX: "arcsec" })],
    [series(), series({ unitX: "arcsec", unitY: "arcsec" })],
  ])("rejects unsupported or incompatible units", (...data) => {
    expect(calculateSpotDiagramRadii(data, [1])).toBeUndefined();
  });
});
