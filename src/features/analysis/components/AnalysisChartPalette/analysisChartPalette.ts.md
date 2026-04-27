# `features/analysis/components/AnalysisChartPalette/analysisChartPalette.ts`

## Purpose

Exports the shared 11-color Viridis-derived palette used by analysis heatmap-style ECharts views so Wavefront Map, Diffraction PSF, and wavelength-mapped line and scatter charts stay visually aligned with a sequential scale that trims the darkest and brightest extremes for better theme contrast.

## Exports

```ts
const ANALYSIS_HEATMAP_COLOR_PALETTE: readonly string[]
```

## Behavior

- Uses an 11-step sequential Viridis-derived palette.
- Keeps palette length stable so wavelength-to-index mapping stays unchanged in analysis charts.
- Deliberately favors perceptual uniformity and color-vision accessibility over the previous blue-to-red diverging midpoint.
- Starts from a lighter indigo rather than raw Viridis purple so low-end values remain visible in dark theme.

## Usage

- Imported by `wavefrontMapChartOption.ts`.
- Imported by `diffractionPsfChartOption.ts`.
- Imported by `spotDiagramChartOption.ts`.
- Imported by `rayFanChartOption.ts`.
- Imported by `opdFanChartOption.ts`.
