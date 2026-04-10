# `features/analysis/components/`

Components for optical analysis plots and aberration data.

## Shared Modules

- [AnalysisPlotView.tsx](./AnalysisPlotView.tsx.md) — Renders analysis plot controls and switches between chart renderers and PNG fallbacks
- [createAnalysisChartComponent.tsx](./createAnalysisChartComponent.tsx.md) — Higher-order factory that returns analysis chart function components with shared ECharts lifecycle handling
- [analysisChartPalette.ts](./analysisChartPalette.ts.md) — Shared 11-color palette used by analysis heatmap-style ECharts views
- [AnalysisPlotContainer.tsx](./AnalysisPlotContainer.tsx.md) — Manages analysis plot selection and data fetching via Pyodide

## Chart Directories

- [diffraction-psf-chart/](./diffraction-psf-chart/index.md) — Diffraction PSF chart component, option builder, specs, and moved tests
- [geo-psf-chart/](./geo-psf-chart/index.md) — Geometric PSF chart component, option builder, specs, and moved tests
- [opd-fan-chart/](./opd-fan-chart/index.md) — OPD fan chart component, option builder, specs, and moved tests
- [ray-fan-chart/](./ray-fan-chart/index.md) — Ray fan chart component, option builder, specs, and moved tests
- [spot-diagram-chart/](./spot-diagram-chart/index.md) — Spot diagram chart component, option builder, specs, and moved tests
- [surface-by-surface-3rd-order-chart/](./surface-by-surface-3rd-order-chart/index.md) — Surface-by-surface Seidel chart component, option builder, specs, and moved tests
- [wavefront-map-chart/](./wavefront-map-chart/index.md) — Wavefront map chart component, option builder, specs, and moved tests
