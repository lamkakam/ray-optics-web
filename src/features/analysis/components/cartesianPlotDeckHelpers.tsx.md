# `features/analysis/components/cartesianPlotDeckHelpers.tsx`

## Purpose

Provides shared deck.gl cartesian plot layout and SVG overlay helpers for analysis charts that render square orthographic plots with axis chrome and optional vertical color bars.

## Key Behaviors

- Measures a chart parent with `ResizeObserver` and applies the shared analysis sizing policy.
- Computes the square plot viewport layout, preserving the PSF axis/color-bar spacing and y-axis label alignment.
- Computes initial orthographic zoom as `log2(plotSide / (2 * axisExtent * 1.12))`.
- Derives visible x/y domains from controlled orthographic view state and the square plot size.
- Produces five evenly spaced axis ticks for each visible domain.
- Converts hex palette colors to RGB tuples for deck.gl layer color ranges.
- Renders theme-aware SVG axes, tick labels, axis labels, and optional vertical palette color bars using `currentColor`.

## Consumers

- `GeoPsfChart`
- `DiffractionPsfChart`
- `WavefrontMapChart`
