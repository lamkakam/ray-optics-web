# `features/analysis/components/FieldCurveChart/FieldCurveChart.tsx`

## Purpose

Wraps the shared analysis ECharts component factory for field-curve data used by both Field Curvature and Astigmatism Curve plots.

## Props

- `fieldCurveData`: `FieldCurveData` or `AstigmatismCurveData` payload to render.
- `seriesDefinitions`: optional explicit series definitions. Omit for default `Sagittal` and `Tangential` field-curvature series; pass one `Astigmatism` series for astigmatism curves.
- `autoHeight`: optional responsive height behavior passed through to the shared chart factory.
