# `features/analysis/components/AstigmatismChart/AstigmatismChart.tsx`

## Purpose

Wraps the shared analysis ECharts component factory for the Astigmatism Curve plot.

## Props

- `astigmatismCurveData`: `AstigmatismCurveData` payload to render.
- `autoHeight`: optional responsive height behavior passed through to the shared chart factory.

## Behavior

- Uses `buildAstigmatismOption` to render one `Astigmatism` line series.
- Uses `data-testid="astigmatism-chart"` and `aria-label="Astigmatism plot"`.
- Matches the field-curvature chart sizing behavior: height is 60% of parent width with a 300px minimum, capped by parent height unless `autoHeight` is enabled.
