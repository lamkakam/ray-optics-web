# `features/analysis/components/`

Components for optical analysis plots and aberration data.

`index.ts` re-exports the public analysis component surface for preferred imports from `@/features/analysis/components` or from each PascalCase module directory.

## Shared Modules

- [AnalysisPlotContainer.tsx](./AnalysisPlotContainer/AnalysisPlotContainer.tsx.md) — Manages analysis plot selection and data fetching via Pyodide
- [AnalysisPlotView.tsx](./AnalysisPlotView/AnalysisPlotView.tsx.md) — Renders analysis plot controls and switches between typed chart renderers
- [CreateAnalysisChartComponent/](./CreateAnalysisChartComponent/createAnalysisChartComponent.tsx.md) — Higher-order factory that returns analysis chart function components with shared ECharts lifecycle handling
- [AnalysisChartPalette/](./AnalysisChartPalette/analysisChartPalette.ts.md) — Shared 11-color palette used by analysis heatmap-style ECharts views

## Chart Directories

- [DiffractionPsfChart/](./DiffractionPsfChart/index.md) — Diffraction PSF chart component, option builder, specs, and moved tests
- [GeoPsfChart/](./GeoPsfChart/index.md) — Geometric PSF chart component, option builder, specs, and moved tests
- [OpdFanChart/](./OpdFanChart/index.md) — OPD fan chart component, option builder, specs, and moved tests
- [RayFanChart/](./RayFanChart/index.md) — Ray fan chart component, option builder, specs, and moved tests
- [SpotDiagramChart/](./SpotDiagramChart/index.md) — Spot diagram chart component, option builder, specs, and moved tests
- [SurfaceBySurface3rdOrderChart/](./SurfaceBySurface3rdOrderChart/index.md) — Surface-by-surface Seidel chart component, option builder, specs, and moved tests
- [WavefrontMapChart/](./WavefrontMapChart/index.md) — Wavefront map chart component, option builder, specs, and moved tests
