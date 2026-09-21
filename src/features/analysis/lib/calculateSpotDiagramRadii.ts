import type { SpotDiagramData } from "@/features/analysis/types/plotData";

/** Unrounded radii measured from the supplied image-reference origin. */
export interface SpotDiagramRadii {
  readonly geoRadius: number;
  readonly rmsRadius: number;
  readonly unit: "µm" | "arcsec";
}

const MICROMETRES_PER_UNIT: Readonly<Record<string, number | undefined>> = {
  m: 1e6,
  cm: 1e4,
  mm: 1e3,
  in: 25400,
  ft: 304800,
  nm: 1e-3,
  µm: 1,
  μm: 1,
  um: 1,
  micron: 1,
  microns: 1,
  micrometer: 1,
  micrometers: 1,
  micrometre: 1,
  micrometres: 1,
};

/**
 * Combines all wavelength series for one selected field without recentering or
 * consulting legend visibility. Each paired finite ray gets the positive finite
 * weight at its series' `wvlIdx`; missing and unusable weights exclude the series.
 * GEO is the greatest hypot(x, y); RMS is sqrt(sum(weight * (x² + y²)) / sum(weight)).
 * Physical axes convert independently to µm; arcsec stays angular. Unsupported
 * units or mixed angular/physical axes or series return undefined, as do absent
 * usable samples or nonfinite results. Unmatched coordinates are ignored.
 * This pure helper is independent of React, chart state, and the worker.
 */
export function calculateSpotDiagramRadii(
  data: SpotDiagramData,
  wavelengthWeights: Readonly<Record<number, number | undefined>>,
): SpotDiagramRadii | undefined {
  let unit: SpotDiagramRadii["unit"] | undefined;
  let geoRadius = 0;
  let weightedSquaredRadius = 0;
  let totalWeight = 0;

  for (const series of data) {
    const weight = wavelengthWeights[series.wvlIdx];
    if (weight === undefined || !Number.isFinite(weight) || weight <= 0)
      continue;

    const angularX = series.unitX === "arcsec";
    const angularY = series.unitY === "arcsec";
    const scaleX = angularX ? 1 : MICROMETRES_PER_UNIT[series.unitX];
    const scaleY = angularY ? 1 : MICROMETRES_PER_UNIT[series.unitY];
    const seriesUnit = angularX ? "arcsec" : "µm";
    if (
      typeof scaleX !== "number" ||
      typeof scaleY !== "number" ||
      angularX !== angularY ||
      (unit !== undefined && unit !== seriesUnit)
    )
      return undefined;
    unit = seriesUnit;

    const count = Math.min(series.x.length, series.y.length);
    for (let index = 0; index < count; index += 1) {
      const x = series.x[index];
      const y = series.y[index];
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      const radius = Math.hypot(x * scaleX, y * scaleY);
      if (!Number.isFinite(radius)) continue;
      geoRadius = Math.max(geoRadius, radius);
      weightedSquaredRadius += weight * radius * radius;
      totalWeight += weight;
    }
  }

  const rmsRadius = Math.sqrt(weightedSquaredRadius / totalWeight);
  if (unit === undefined || totalWeight <= 0 || !Number.isFinite(rmsRadius))
    return undefined;
  return { geoRadius, rmsRadius, unit };
}
