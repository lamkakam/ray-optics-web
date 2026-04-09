# `features/analysis/components/analysisChartPalette.ts`

## Purpose

Exports the shared 11-color palette used by analysis heatmap-style ECharts views so Wavefront Map and Diffraction PSF stay visually aligned.

## Exports

```ts
const ANALYSIS_HEATMAP_COLOR_PALETTE: readonly string[]
```

## Usage

- Imported by `wavefrontMapChartOption.ts`.
- Imported by `diffractionPsfChartOption.ts`.
