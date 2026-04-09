# `features/analysis/components/`

Components for optical analysis plots and aberration data.

## Components

- [AnalysisPlotView.tsx](./AnalysisPlotView.tsx.md) — Renders analysis plot controls and switches between PNG plots, the wavefront heatmap, and the diffraction PSF chart
- [WavefrontMapChart.tsx](./WavefrontMapChart.tsx.md) — Owns the Wavefront Map ECharts canvas lifecycle and responsive sizing
- [wavefrontMapChartOption.ts](./wavefrontMapChartOption.ts.md) — Builds the Wavefront Map ECharts heatmap/visualMap option from worker data
- [DiffractionPsfChart.tsx](./DiffractionPsfChart.tsx.md) — Owns the Diffraction PSF ECharts canvas lifecycle and responsive sizing
- [diffractionPsfChartOption.ts](./diffractionPsfChartOption.ts.md) — Builds the Diffraction PSF ECharts scatter/visualMap option from worker data
- [analysisChartPalette.ts](./analysisChartPalette.ts.md) — Shared 11-color palette used by analysis heatmap-style ECharts views
- [AnalysisPlotContainer.tsx](./AnalysisPlotContainer.tsx.md) — Manages analysis plot selection and data fetching via Pyodide
