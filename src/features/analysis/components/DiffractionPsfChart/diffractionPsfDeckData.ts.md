# `features/analysis/components/DiffractionPsfChart/diffractionPsfDeckData.ts`

## Purpose

Prepares worker-provided `DiffractionPsfData` for the deck.gl diffraction PSF renderer.

## API

```ts
const DIFFRACTION_PSF_LOG_FLOOR: number

interface DiffractionPsfBitmapImage {
  data: Uint8ClampedArray<ArrayBuffer>;
  width: number;
  height: number;
}

function buildDiffractionPsfBitmap(diffractionPsfData: DiffractionPsfData): DiffractionPsfPreparedData

function formatDiffractionPsfFluxLabel(log10Flux: number): string
```

## Key Behaviors

- Converts only `DiffractionPsfData.x`, `DiffractionPsfData.y`, and `DiffractionPsfData.z` into row-major raw RGBA bytes; the React component wraps these bytes in browser `ImageData` before passing them to deck.gl `BitmapLayer`.
- Does not consume geometric PSF ray data or `GeoPsfData`.
- Clamps negative or missing flux samples to zero before peak normalization.
- Normalizes positive flux linearly against the brightest positive bin so the maximum normalized flux value is `1`.
- Converts normalized flux to `log10` display values after normalization.
- Uses `DIFFRACTION_PSF_LOG_FLOOR` (`log10(5e-4)`) for zero-flux bins, missing or negative flux bins, and positive normalized flux below `5e-4`, avoiding `NaN` and infinities while keeping the lower log-scale display floor at `5e-4`.
- Maps log-scaled values onto the shared analysis heatmap palette with the shared interpolation helper.
- Writes image rows top-to-bottom for browser `ImageData`, so the lowest physical y coordinate appears in the bottom bitmap row and Cartesian orientation is preserved in deck.gl.
- Derives rectangular `bounds` from the first and last physical axis coordinates plus or minus half that axis' median positive spacing, falling back to spacing `1` when no spacing exists.
- Computes a symmetric `axisExtent` from the largest absolute physical coordinate, falling back to `1`.
- Formats color-bar labels back from log-scale values to normalized linear flux with the shared plot-value formatter.
