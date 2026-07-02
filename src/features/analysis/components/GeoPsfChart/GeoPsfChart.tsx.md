# `features/analysis/components/GeoPsfChart/GeoPsfChart.tsx`

## Purpose

Renders the Geometric PSF analysis view as a deck.gl `ScatterplotLayer` inside an `OrthographicView` using Cartesian coordinates.

## Props

```ts
interface GeoPsfChartProps {
  geoPsfData: GeoPsfData;
  autoHeight?: boolean;
}
```

## Key Behaviors

- Measures the parent with `useMeasuredChartSize(...)` and preserves the square `autoHeight` sizing policy.
- Reuses the shared cartesian deck.gl layout, initial zoom, visible-domain, and tick helpers used by Diffraction PSF and Wavefront Map.
- Uses the stable deck.gl view id `geo-psf-view`.
- Keeps deck.gl view state controlled so pan and zoom updates drive live SVG tick labels.
- Renders PSF samples through `ScatterplotLayer` with `COORDINATE_SYSTEM.CARTESIAN`.
- Renders theme-aware SVG x/y axes, ticks, and axis labels without a color bar.
- Keeps `data-testid="geo-psf-chart"` and `aria-label="Geometric PSF plot"`.
