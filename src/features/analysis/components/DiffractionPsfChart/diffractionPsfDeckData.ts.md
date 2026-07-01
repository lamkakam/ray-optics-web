# `features/analysis/components/DiffractionPsfChart/diffractionPsfDeckData.ts`

## Purpose

Prepares worker-provided `DiffractionPsfData` for the deck.gl diffraction PSF renderer.

## API

```ts
const DIFFRACTION_PSF_LOG_FLOOR: number

interface DiffractionPsfBin {
  x: number;
  y: number;
  normalizedFlux: number;
  logScaledFlux: number;
}

function buildDiffractionPsfBins(diffractionPsfData: DiffractionPsfData): DiffractionPsfPreparedData

function formatDiffractionPsfFluxLabel(log10Flux: number): string
```

## Key Behaviors

- Flattens only `DiffractionPsfData.x`, `DiffractionPsfData.y`, and `DiffractionPsfData.z` into physical PSF bin records.
- Does not consume geometric PSF ray data or `GeoPsfData`.
- Clamps negative or missing flux samples to zero before total-flux normalization.
- Normalizes positive total flux linearly so the sum of all bin `normalizedFlux` values is `1`.
- Uses one output datum per physical PSF bin so deck.gl `GridLayer` `SUM` aggregation preserves the intended bin value.
- Converts normalized flux to `log10` display weights after normalization.
- Uses `DIFFRACTION_PSF_LOG_FLOOR` for zero-flux bins and as the lower log-scale display floor, avoiding `NaN` and infinities.
- Derives `cellSize` from the minimum median positive spacing across the physical `x` and `y` axes, falling back to `1` when no spacing exists.
- Computes a symmetric `axisExtent` from the largest absolute physical coordinate, falling back to `1`.
- Formats color-bar labels back from log-scale values to normalized linear flux with the shared plot-value formatter.
