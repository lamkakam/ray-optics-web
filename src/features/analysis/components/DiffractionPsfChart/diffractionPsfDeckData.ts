/**
# `features/analysis/components/DiffractionPsfChart/diffractionPsfDeckData.ts`

## Purpose

Prepares worker-provided `DiffractionPsfData` for the deck.gl diffraction PSF renderer.

## Key Behaviors

- Converts only `DiffractionPsfData.x`, `DiffractionPsfData.y`, and `DiffractionPsfData.z` into row-major raw RGBA bytes; the React component wraps these bytes in browser `ImageData` before passing them to deck.gl `BitmapLayer`.
- Does not consume geometric PSF ray data or `GeoPsfData`.
- Clamps negative or missing flux samples to zero before peak normalization.
- Normalizes positive flux linearly against the brightest positive bin so the maximum normalized flux value is `1`.
- Converts normalized flux to `log10` display values after normalization.
- Uses `DIFFRACTION_PSF_LOG_FLOOR` (`log10(5e-4)`) for zero-flux bins, missing or negative flux bins, and positive normalized flux below `5e-4`, avoiding `NaN` and infinities while keeping the lower log-scale display floor at `5e-4`.
- Maps log-scaled values onto the shared analysis heatmap palette with the shared interpolation helper.
- Writes image rows top-to-bottom for browser `ImageData`, so the lowest physical y coordinate appears in the bottom bitmap row and Cartesian orientation is preserved in deck.gl.
- Derives rectangular `bounds` from the first and last physical axis coordinates plus or minus half that axis' median positive spacing, falling back to spacing `1` when no spacing exists.
- Computes a symmetric `axisExtent` from the largest absolute physical coordinate, falling back to `1`.
- Formats color-bar labels back from log-scale values to normalized linear flux with the shared plot-value formatter.
*/
import { formatPlotValue } from "@/shared/lib/chart-formatting/formatPlotValue";
import { interpolateAnalysisHeatmapColor } from "@/features/analysis/lib/analysisChartPalette";
import type { DiffractionPsfData } from "@/features/analysis/types/plotData";

export const DIFFRACTION_PSF_LOG_FLOOR = Math.log10(5e-4);

export interface DiffractionPsfBitmapImage {
  readonly data: Uint8ClampedArray<ArrayBuffer>;
  readonly width: number;
  readonly height: number;
}

export interface DiffractionPsfPreparedData {
  readonly image: DiffractionPsfBitmapImage;
  readonly bounds: [number, number, number, number];
  readonly axisExtent: number;
  readonly minLogFlux: number;
  readonly maxLogFlux: number;
}

function getMedianPositiveSpacing(values: readonly number[]): number | undefined {
  const spacings: number[] = [];
  for (let index = 1; index < values.length; index += 1) {
    const spacing = Math.abs(values[index] - values[index - 1]);
    if (Number.isFinite(spacing) && spacing > 0) {
      spacings.push(spacing);
    }
  }

  if (spacings.length === 0) {
    return undefined;
  }

  spacings.sort((left, right) => left - right);
  return spacings[Math.floor(spacings.length / 2)];
}

export function formatDiffractionPsfFluxLabel(log10Flux: number): string {
  return formatPlotValue(10 ** log10Flux);
}

function getAxisBounds(values: readonly number[]): readonly [number, number] {
  if (values.length === 0) {
    return [-0.5, 0.5];
  }

  const spacing = getMedianPositiveSpacing(values) ?? 1;
  const first = values[0];
  const last = values[values.length - 1];

  return [
    Math.min(first, last) - (spacing / 2),
    Math.max(first, last) + (spacing / 2),
  ];
}

function getLogScaledFlux(flux: number, peakFlux: number): number {
  if (peakFlux <= 0 || flux <= 0) {
    return DIFFRACTION_PSF_LOG_FLOOR;
  }

  return Math.max(DIFFRACTION_PSF_LOG_FLOOR, Math.log10(flux / peakFlux));
}

export function buildDiffractionPsfBitmap(
  diffractionPsfData: DiffractionPsfData,
): DiffractionPsfPreparedData {
  const width = diffractionPsfData.x.length;
  const height = diffractionPsfData.y.length;
  const imageData = new Uint8ClampedArray(width * height * 4);
  let peakFlux = 0;
  let axisExtent = 0;

  for (let xIndex = 0; xIndex < width; xIndex += 1) {
    axisExtent = Math.max(axisExtent, Math.abs(diffractionPsfData.x[xIndex]));
    for (let yIndex = 0; yIndex < height; yIndex += 1) {
      axisExtent = Math.max(axisExtent, Math.abs(diffractionPsfData.y[yIndex]));
      const flux = Math.max(0, diffractionPsfData.z[xIndex]?.[yIndex] ?? 0);
      peakFlux = Math.max(peakFlux, flux);
    }
  }

  let minLogFlux = Number.POSITIVE_INFINITY;
  let maxLogFlux = Number.NEGATIVE_INFINITY;
  const logScaledFluxes: number[][] = [];

  for (let xIndex = 0; xIndex < width; xIndex += 1) {
    logScaledFluxes[xIndex] = [];
    for (let yIndex = 0; yIndex < height; yIndex += 1) {
      const flux = Math.max(0, diffractionPsfData.z[xIndex]?.[yIndex] ?? 0);
      const logScaledFlux = getLogScaledFlux(flux, peakFlux);
      logScaledFluxes[xIndex][yIndex] = logScaledFlux;
      minLogFlux = Math.min(minLogFlux, logScaledFlux);
      maxLogFlux = Math.max(maxLogFlux, logScaledFlux);
    }
  }

  const normalizedMinLogFlux = Number.isFinite(minLogFlux) ? minLogFlux : DIFFRACTION_PSF_LOG_FLOOR;
  const normalizedMaxLogFlux = Number.isFinite(maxLogFlux)
    ? Math.max(normalizedMinLogFlux, maxLogFlux)
    : normalizedMinLogFlux;
  const logFluxRange = normalizedMaxLogFlux - normalizedMinLogFlux;

  for (let rowIndex = 0; rowIndex < height; rowIndex += 1) {
    const yIndex = height - 1 - rowIndex;
    for (let xIndex = 0; xIndex < width; xIndex += 1) {
      const logScaledFlux = logScaledFluxes[xIndex]?.[yIndex] ?? DIFFRACTION_PSF_LOG_FLOOR;
      const normalizedColorValue = logFluxRange > 0
        ? (logScaledFlux - normalizedMinLogFlux) / logFluxRange
        : 0;
      const [red, green, blue, alpha] = interpolateAnalysisHeatmapColor(normalizedColorValue);
      const pixelOffset = ((rowIndex * width) + xIndex) * 4;
      imageData[pixelOffset] = red;
      imageData[pixelOffset + 1] = green;
      imageData[pixelOffset + 2] = blue;
      imageData[pixelOffset + 3] = alpha;
    }
  }

  const [xMin, xMax] = getAxisBounds(diffractionPsfData.x);
  const [yMin, yMax] = getAxisBounds(diffractionPsfData.y);

  return {
    image: {
      data: imageData,
      width,
      height,
    },
    bounds: [xMin, yMin, xMax, yMax],
    axisExtent: axisExtent > 0 ? axisExtent : 1,
    minLogFlux: normalizedMinLogFlux,
    maxLogFlux: normalizedMaxLogFlux,
  };
}
