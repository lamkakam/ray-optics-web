import { ANALYSIS_HEATMAP_COLOR_PALETTE } from "@/features/analysis/lib/analysisChartPalette";
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

function hexToRgba(hexColor: string, alpha: number): readonly [number, number, number, number] {
  return [
    Number.parseInt(hexColor.slice(1, 3), 16),
    Number.parseInt(hexColor.slice(3, 5), 16),
    Number.parseInt(hexColor.slice(5, 7), 16),
    alpha,
  ];
}

function interpolatePaletteColor(normalizedValue: number): readonly [number, number, number, number] {
  const palettePosition = normalizedValue * (ANALYSIS_HEATMAP_COLOR_PALETTE.length - 1);
  const lowerIndex = Math.max(
    0,
    Math.min(ANALYSIS_HEATMAP_COLOR_PALETTE.length - 1, Math.floor(palettePosition)),
  );
  const upperIndex = Math.max(
    0,
    Math.min(ANALYSIS_HEATMAP_COLOR_PALETTE.length - 1, lowerIndex + 1),
  );
  const fraction = palettePosition - lowerIndex;
  const [lowerRed, lowerGreen, lowerBlue] = hexToRgba(ANALYSIS_HEATMAP_COLOR_PALETTE[lowerIndex], 255);
  const [upperRed, upperGreen, upperBlue] = hexToRgba(ANALYSIS_HEATMAP_COLOR_PALETTE[upperIndex], 255);

  return [
    Math.round(lowerRed + ((upperRed - lowerRed) * fraction)),
    Math.round(lowerGreen + ((upperGreen - lowerGreen) * fraction)),
    Math.round(lowerBlue + ((upperBlue - lowerBlue) * fraction)),
    255,
  ];
}

function getAxisMinMax(values: readonly number[]): readonly [number, number] {
  if (values.length === 0) {
    return [0, 0];
  }

  return [Math.min(...values), Math.max(...values)];
}

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
      const [red, green, blue, alpha] = interpolatePaletteColor(normalizedValue);
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
