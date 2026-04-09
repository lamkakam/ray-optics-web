# `features/analysis/components/`

Components for optical analysis plots and aberration data.

## Components

- [AnalysisPlotView.tsx](./AnalysisPlotView.tsx.md) — Renders analysis plot controls and switches between image plots and the diffraction PSF chart
- [DiffractionPsfChart.tsx](./DiffractionPsfChart.tsx.md) — Owns the Diffraction PSF ECharts canvas lifecycle and responsive sizing
- [diffractionPsfChartOption.ts](./diffractionPsfChartOption.ts.md) — Builds the Diffraction PSF ECharts scatter/visualMap option from worker data
- [AnalysisPlotContainer.tsx](./AnalysisPlotContainer.tsx.md) — Manages analysis plot selection and data fetching via Pyodide
