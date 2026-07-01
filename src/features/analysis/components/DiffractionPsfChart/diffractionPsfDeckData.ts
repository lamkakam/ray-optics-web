import { formatPlotValue } from "@/shared/lib/chart-formatting/formatPlotValue";
import type { DiffractionPsfData } from "@/features/analysis/types/plotData";

export const DIFFRACTION_PSF_LOG_FLOOR = -9;

export interface DiffractionPsfBin {
  readonly x: number;
  readonly y: number;
  readonly normalizedFlux: number;
  readonly logScaledFlux: number;
}

export interface DiffractionPsfPreparedData {
  readonly bins: readonly DiffractionPsfBin[];
  readonly cellSize: number;
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

export function buildDiffractionPsfBins(
  diffractionPsfData: DiffractionPsfData,
): DiffractionPsfPreparedData {
  let totalFlux = 0;
  let axisExtent = 0;
  const rawBins: Array<Pick<DiffractionPsfBin, "x" | "y"> & { readonly flux: number }> = [];

  for (let xIndex = 0; xIndex < diffractionPsfData.x.length; xIndex += 1) {
    const x = diffractionPsfData.x[xIndex];
    axisExtent = Math.max(axisExtent, Math.abs(x));

    for (let yIndex = 0; yIndex < diffractionPsfData.y.length; yIndex += 1) {
      const y = diffractionPsfData.y[yIndex];
      const flux = Math.max(0, diffractionPsfData.z[xIndex]?.[yIndex] ?? 0);
      axisExtent = Math.max(axisExtent, Math.abs(y));
      totalFlux += flux;
      rawBins.push({ x, y, flux });
    }
  }

  let minLogFlux = 0;
  let maxLogFlux = DIFFRACTION_PSF_LOG_FLOOR;
  const bins = rawBins.map((bin) => {
    const normalizedFlux = totalFlux > 0 ? bin.flux / totalFlux : 0;
    const logScaledFlux = normalizedFlux > 0
      ? Math.max(DIFFRACTION_PSF_LOG_FLOOR, Math.log10(normalizedFlux))
      : DIFFRACTION_PSF_LOG_FLOOR;
    minLogFlux = Math.min(minLogFlux, logScaledFlux);
    maxLogFlux = Math.max(maxLogFlux, logScaledFlux);

    return {
      x: bin.x,
      y: bin.y,
      normalizedFlux,
      logScaledFlux,
    };
  });

  const spacingCandidates = [
    getMedianPositiveSpacing(diffractionPsfData.x),
    getMedianPositiveSpacing(diffractionPsfData.y),
  ].filter((spacing): spacing is number => spacing !== undefined);

  return {
    bins,
    cellSize: spacingCandidates.length > 0 ? Math.min(...spacingCandidates) : 1,
    axisExtent: axisExtent > 0 ? axisExtent : 1,
    minLogFlux,
    maxLogFlux: Math.max(minLogFlux, maxLogFlux),
  };
}
