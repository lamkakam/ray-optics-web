/**
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
*/
export interface LineAxisData {
  x: number[];
  y: number[];
}

export interface FanLineAxisData {
  x: number[];
  y: Array<number | undefined>;
}

export interface DiffractionPsfData {
  fieldIdx: number;
  wvlIdx: number;
  x: number[];
  y: number[];
  z: number[][];
  unitX: string;
  unitY: string;
  unitZ: string;
}

export interface DiffractionMtfData {
  fieldIdx: number;
  wvlIdx: number;
  Tangential: LineAxisData;
  Sagittal: LineAxisData;
  IdealTangential: LineAxisData;
  IdealSagittal: LineAxisData;
  unitX: string;
  unitY: string;
  cutoffTangential: number;
  cutoffSagittal: number;
  scaleKind: "image-na" | "exit-pupil";
  naTangential?: number;
  naSagittal?: number;
  exitPupilDiameterTangential?: number;
  exitPupilDiameterSagittal?: number;
}

export interface WavefrontMapData {
  fieldIdx: number;
  wvlIdx: number;
  x: number[];
  y: number[];
  z: (number | undefined)[][];
  unitX: string;
  unitY: string;
  unitZ: string;
}

export interface StrehlVsWavelengthData {
  fieldIdx: number;
  x: number[];
  y: number[];
  unitX: string;
  unitY: string;
}

export interface GeoPsfData {
  fieldIdx: number;
  wvlIdx: number;
  x: number[];
  y: number[];
  unitX: string;
  unitY: string;
}

export interface SpotDiagramSeriesData {
  fieldIdx: number;
  wvlIdx: number;
  x: number[];
  y: number[];
  unitX: string;
  unitY: string;
}

export type SpotDiagramData = SpotDiagramSeriesData[];

export interface FieldCurveData {
  wvlIdx: number;
  Sagittal: LineAxisData;
  Tangential: LineAxisData;
  fieldLabels: string[];
  unitX: string;
  unitY: string;
}

export interface AstigmatismCurveData {
  wvlIdx: number;
  Astigmatism: LineAxisData;
  fieldLabels: string[];
  unitX: string;
  unitY: string;
}

export interface LongitudinalSphericalAberrationSeriesData {
  wvlIdx: number;
  LSA: LineAxisData;
  unitX: string;
  unitY: string;
}

export type LongitudinalSphericalAberrationData = LongitudinalSphericalAberrationSeriesData[];

export type RayFanAxisData = FanLineAxisData;

export interface RayFanSeriesData {
  fieldIdx: number;
  wvlIdx: number;
  Sagittal: RayFanAxisData;
  Tangential: RayFanAxisData;
  unitX: string;
  unitY: string;
}

export type RayFanData = RayFanSeriesData[];

export type OpdFanAxisData = FanLineAxisData;

export interface OpdFanSeriesData {
  fieldIdx: number;
  wvlIdx: number;
  Sagittal: OpdFanAxisData;
  Tangential: OpdFanAxisData;
  unitX: string;
  unitY: string;
}

export type OpdFanData = OpdFanSeriesData[];
