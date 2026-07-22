import type { GeoPsfData } from "@/features/analysis/types/plotData";

export interface GeoPsfPoint {
  readonly x: number;
  readonly y: number;
}

/**
 * Prepares Geometric PSF point samples for the deck.gl `ScatterplotLayer`.
 *
 * @remarks
 * ## Key Behaviors
 *
 * - Pairs `GeoPsfData.x` and `GeoPsfData.y` by index up to the shorter array length.
 * - Emits typed `{ x, y }` point records only when both paired coordinates are finite.
 * - Computes a symmetric `axisExtent` from all finite x/y samples in the paired range.
 * - Defaults `axisExtent` to `1` when the paired data contains no usable finite extent.
 */
export interface GeoPsfDeckData {
  readonly points: readonly GeoPsfPoint[];
  readonly axisExtent: number;
}

export function buildGeoPsfPoints(geoPsfData: GeoPsfData): GeoPsfDeckData {
  const points: GeoPsfPoint[] = [];
  let axisExtent = 0;
  const pointCount = Math.min(geoPsfData.x.length, geoPsfData.y.length);

  for (let index = 0; index < pointCount; index += 1) {
    const x = geoPsfData.x[index];
    const y = geoPsfData.y[index];

    if (Number.isFinite(x)) {
      axisExtent = Math.max(axisExtent, Math.abs(x));
    }
    if (Number.isFinite(y)) {
      axisExtent = Math.max(axisExtent, Math.abs(y));
    }
    if (Number.isFinite(x) && Number.isFinite(y)) {
      points.push({ x, y });
    }
  }

  return {
    points,
    axisExtent: axisExtent > 0 ? axisExtent : 1,
  };
}
