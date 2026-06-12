# `features/analysis/types/plotData.ts`

## Purpose

Defines analysis plot payload types returned by the Pyodide worker and consumed by analysis chart stores/components.

## Exports

- `DiffractionPsfData`: diffraction PSF axes and intensity grid.
- `LineAxisData`: shared paired `x/y` line samples.
- `DiffractionMtfData`: diffraction MTF measured and ideal line curves plus cutoff metadata.
- `WavefrontMapData`: wavefront-map axes and OPD grid; missing samples are represented as `undefined`.
- `StrehlVsWavelengthData`: selected-field Strehl ratio samples across wavelength, with wavelength units in `unitX`.
- `GeoPsfData`: geometric PSF point-cloud data.
- `SpotDiagramSeriesData`: one wavelength-group spot-diagram point cloud.
- `SpotDiagramData`: all spot-diagram series for a selected field.
- `FieldCurveData`: one wavelength-specific field curvature or astigmatism curve payload with sagittal/tangential focus-shift curves and category field labels.
- `RayFanAxisData`: alias of `LineAxisData` for one transverse ray-fan axis.
- `RayFanSeriesData`: one wavelength-group ray-fan payload with `Tangential` and `Sagittal` curves.
- `RayFanData`: all ray-fan series for a selected field.
- `OpdFanAxisData`: alias of `LineAxisData` for one OPD fan axis.
- `OpdFanSeriesData`: one wavelength-group OPD fan payload with `Tangential` and `Sagittal` curves.
- `OpdFanData`: all OPD fan series for a selected field.

## Usage

```ts
import type { RayFanData } from "@/features/analysis/types/plotData";
```
