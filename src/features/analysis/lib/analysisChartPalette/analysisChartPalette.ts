/** Shared perceptual RGB palette for analysis heatmaps. */
export const ANALYSIS_HEATMAP_COLOR_PALETTE = [
  "#5b2a86",
  "#5a3d9a",
  "#4f4aa8",
  "#4557b2",
  "#3f63b8",
  "#2d708e",
  "#25858e",
  "#1e9b8a",
  "#2ab07f",
  "#52c569",
  "#86d549",
] as const;

function hexToRgba(hexColor: string, alpha: number): readonly [number, number, number, number] {
  return [
    Number.parseInt(hexColor.slice(1, 3), 16),
    Number.parseInt(hexColor.slice(3, 5), 16),
    Number.parseInt(hexColor.slice(5, 7), 16),
    alpha,
  ];
}

/**
 * Exports the shared 11-color Viridis-derived palette used by analysis heatmap-style views so Wavefront Map, Diffraction PSF, and wavelength-mapped line and scatter charts stay visually aligned with a sequential scale that trims the darkest and brightest extremes for better theme contrast.
 *
 * @remarks
 * ## Behavior
 *
 * - Uses an 11-step sequential Viridis-derived palette.
 * - Keeps palette length stable so wavelength-to-index mapping stays unchanged in analysis charts.
 * - Deliberately favors perceptual uniformity and color-vision accessibility over the previous blue-to-red diverging midpoint.
 * - Starts from a lighter indigo rather than raw Viridis purple so low-end values remain visible in dark theme.
 * - Interpolates clamped normalized values between neighboring palette stops and returns opaque RGBA channels for bitmap renderers.
 *
 * - Imported by `WavefrontMapChart.tsx` and `wavefrontMapDeckData.ts`.
 * - Imported by `DiffractionPsfChart.tsx` and `diffractionPsfDeckData.ts`.
 * - Imported by `spotDiagramChartOption.ts`.
 * - Imported by `rayFanChartOption.ts`.
 * - Imported by `opdFanChartOption.ts`.
 */
export function interpolateAnalysisHeatmapColor(
  normalizedValue: number,
): readonly [number, number, number, number] {
  const clampedValue = Number.isFinite(normalizedValue)
    ? Math.max(0, Math.min(1, normalizedValue))
    : 0;
  const palettePosition = clampedValue * (ANALYSIS_HEATMAP_COLOR_PALETTE.length - 1);
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
