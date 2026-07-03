# `features/analysis/components/WavefrontMapChart/wavefrontMapDeckData.ts`

## Purpose

Prepares worker-provided `WavefrontMapData` for the deck.gl wavefront map renderer.

## API

```ts
interface WavefrontBitmapImage {
  data: Uint8ClampedArray<ArrayBuffer>;
  width: number;
  height: number;
}

function buildWavefrontMapBitmap(wavefrontMapData: WavefrontMapData): WavefrontMapPreparedData
```

## Key Behaviors

- Converts the worker x/y/z grid into row-major raw RGBA bytes; the React component wraps these bytes in browser `ImageData` before passing them to deck.gl `BitmapLayer`.
- Scales finite z values linearly between the finite minimum and maximum OPD values.
- Maps scaled values onto the shared 11-color analysis heatmap palette with the shared interpolation helper.
- Encodes `undefined`, `NaN`, and non-finite samples as transparent pixels so missing pupil samples remain blank.
- Keeps equal finite values stable by assigning them to the first palette color rather than producing `NaN` color indexes.
- Derives `bounds` from the physical x/y coordinate minima and maxima.
- Computes `axisExtent` from the largest absolute x/y bound, falling back to `1` so orthographic zoom remains finite.
- Returns finite min/max values for color-bar endpoint labels, falling back to `0` when no finite wavefront values exist.
