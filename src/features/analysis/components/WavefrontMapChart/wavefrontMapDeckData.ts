import { interpolateAnalysisHeatmapColor } from "@/features/analysis/lib/analysisChartPalette";
import type { WavefrontMapData } from "@/features/analysis/types/plotData";

export interface WavefrontBitmapImage {
  readonly data: Uint8ClampedArray<ArrayBuffer>;
  readonly width: number;
  readonly height: number;
}

export interface WavefrontMapPreparedData {
  readonly image: WavefrontBitmapImage;
  readonly bounds: [number, number, number, number];
  readonly axisExtent: number;
  readonly minValue: number;
  readonly maxValue: number;
}

function getAxisMinMax(values: readonly number[]): readonly [number, number] {
  if (values.length === 0) {
    return [0, 0];
  }

  return [Math.min(...values), Math.max(...values)];
}

/**
 * Prepares worker-provided `WavefrontMapData` for the deck.gl wavefront map renderer.
 *
 * @remarks
 * ## Key Behaviors
 *
 * - Converts the worker x/y/z grid into row-major raw RGBA bytes; the React component wraps these bytes in browser `ImageData` before passing them to deck.gl `BitmapLayer`.
 * - Scales finite z values linearly between the finite minimum and maximum OPD values.
 * - Maps scaled values onto the shared 11-color analysis heatmap palette with the shared interpolation helper.
 * - Encodes `undefined`, `NaN`, and non-finite samples as transparent pixels so missing pupil samples remain blank.
 * - Keeps equal finite values stable by assigning them to the first palette color rather than producing `NaN` color indexes.
 * - Derives `bounds` from the physical x/y coordinate minima and maxima.
 * - Computes `axisExtent` from the largest absolute x/y bound, falling back to `1` so orthographic zoom remains finite.
 * - Returns finite min/max values for color-bar endpoint labels, falling back to `0` when no finite wavefront values exist.
 */
export function buildWavefrontMapBitmap(wavefrontMapData: WavefrontMapData): WavefrontMapPreparedData {
  const width = wavefrontMapData.x.length;
  const height = wavefrontMapData.y.length;
  const imageData = new Uint8ClampedArray(width * height * 4);
  let minValue = Number.POSITIVE_INFINITY;
  let maxValue = Number.NEGATIVE_INFINITY;

  for (const row of wavefrontMapData.z) {
    for (const value of row) {
      if (value !== undefined && Number.isFinite(value)) {
        minValue = Math.min(minValue, value);
        maxValue = Math.max(maxValue, value);
      }
    }
  }

  const normalizedMin = Number.isFinite(minValue) ? minValue : 0;
  const normalizedMax = Number.isFinite(maxValue) ? Math.max(normalizedMin, maxValue) : normalizedMin;
  const valueRange = normalizedMax - normalizedMin;

  for (let yIndex = 0; yIndex < height; yIndex += 1) {
    for (let xIndex = 0; xIndex < width; xIndex += 1) {
      const value = wavefrontMapData.z[yIndex]?.[xIndex];
      const pixelOffset = ((yIndex * width) + xIndex) * 4;
      if (value === undefined || !Number.isFinite(value)) {
        imageData[pixelOffset + 3] = 0;
        continue;
      }

      const normalizedValue = valueRange > 0
        ? Math.max(0, Math.min(1, (value - normalizedMin) / valueRange))
        : 0;
      const [red, green, blue, alpha] = interpolateAnalysisHeatmapColor(normalizedValue);
      imageData[pixelOffset] = red;
      imageData[pixelOffset + 1] = green;
      imageData[pixelOffset + 2] = blue;
      imageData[pixelOffset + 3] = alpha;
    }
  }

  const [xMin, xMax] = getAxisMinMax(wavefrontMapData.x);
  const [yMin, yMax] = getAxisMinMax(wavefrontMapData.y);
  const axisExtent = Math.max(Math.abs(xMin), Math.abs(xMax), Math.abs(yMin), Math.abs(yMax), 1);

  return {
    image: {
      data: imageData,
      width,
      height,
    },
    bounds: [xMin, yMin, xMax, yMax],
    axisExtent,
    minValue: normalizedMin,
    maxValue: normalizedMax,
  };
}
