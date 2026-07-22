# `features/glass-map/components/`

Components for the interactive glass map (Abbe diagram) feature.

Direct component directories expose an `index.ts` barrel so page-level imports can target the component directory.

## Components

- [GlassScatterPlot.tsx](./GlassScatterPlot/GlassScatterPlot.tsx) — Abbe diagram scatter plot with glass selections (visx)
- [GlassDetailPanel.tsx](./GlassDetailPanel/GlassDetailPanel.tsx) — displays glass material properties (refractive index, V-number, etc.)
- [GlassMapControls.tsx](./GlassMapControls/GlassMapControls.tsx) — filter and zoom controls for the glass map view
- [GlassMapCatalogSelector.tsx](./GlassMapCatalogSelector/GlassMapCatalogSelector.tsx) — catalog and searchable glass selector for committed detail selection
