# `features/analysis/types/plotData.ts`

## Purpose

Defines analysis plot payload types returned by the Pyodide worker and consumed by analysis chart stores/components.

## Exports

- `DiffractionPsfData`: diffraction PSF axes and intensity grid.
- `LineAxisData`: shared paired `x/y` line samples.
- `FanLineAxisData`: paired fan `x/y` samples where `y` can be `undefined` for aperture-blocked samples.
- `DiffractionMtfData`: diffraction MTF measured and ideal line curves plus a required `scaleKind` discriminator. Finite `image-na` payloads carry optional directional NA metadata; afocal `exit-pupil` payloads carry optional projected pupil diameters.
- `WavefrontMapData`: wavefront-map axes and OPD grid; missing samples are represented as `undefined`.
- `StrehlVsWavelengthData`: selected-field Strehl ratio samples across wavelength, with wavelength units in `unitX`.
- `GeoPsfData`: geometric PSF point-cloud data.
- `SpotDiagramSeriesData`: one wavelength-group spot-diagram point cloud.
- `SpotDiagramData`: all spot-diagram series for a selected field.
- `FieldCurveData`: one wavelength-specific field curvature payload with sagittal/tangential focus-shift curves and category field labels.
- `AstigmatismCurveData`: one wavelength-specific astigmatism payload with one `Astigmatism` focal-separation curve and category field labels.
- `LongitudinalSphericalAberrationSeriesData`: one wavelength-group longitudinal spherical aberration payload with an `LSA` curve.
- `LongitudinalSphericalAberrationData`: all longitudinal spherical aberration series for all configured wavelengths.
- `RayFanAxisData`: alias of `FanLineAxisData` for one transverse ray-fan axis. Missing ordinates represent blocked rays and render as chart gaps.
- `RayFanSeriesData`: one wavelength-group ray-fan payload with `Tangential` and `Sagittal` curves.
- `RayFanData`: all ray-fan series for a selected field.
- `OpdFanAxisData`: alias of `FanLineAxisData` for one OPD fan axis. Missing ordinates represent blocked rays and render as chart gaps.
- `OpdFanSeriesData`: one wavelength-group OPD fan payload with `Tangential` and `Sagittal` curves.
- `OpdFanData`: all OPD fan series for a selected field.

## Usage

```ts
import type { RayFanData } from "@/features/analysis/types/plotData";
```
