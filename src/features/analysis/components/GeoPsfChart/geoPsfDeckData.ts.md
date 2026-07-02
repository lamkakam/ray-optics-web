# `features/analysis/components/GeoPsfChart/geoPsfDeckData.ts`

## Purpose

Prepares Geometric PSF point samples for the deck.gl `ScatterplotLayer`.

## Key Behaviors

- Pairs `GeoPsfData.x` and `GeoPsfData.y` by index up to the shorter array length.
- Emits typed `{ x, y }` point records only when both paired coordinates are finite.
- Computes a symmetric `axisExtent` from all finite x/y samples in the paired range.
- Defaults `axisExtent` to `1` when the paired data contains no usable finite extent.
