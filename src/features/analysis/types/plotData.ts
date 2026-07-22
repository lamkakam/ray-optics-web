/** Defines analysis plot payload types returned by the Pyodide worker and consumed by analysis chart stores/components. */
export interface LineAxisData {
  x: number[];
  y: number[];
}

/** Paired pupil-coordinate and aberration samples for one fan axis. */
export interface FanLineAxisData {
  x: number[];
  y: Array<number | undefined>;
}

/** Physical coordinate axes and normalized diffraction-PSF intensity grid. */
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

/** Measured and ideal sagittal/tangential MTF series. */
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

/** Physical coordinate axes and wavefront-error grid. */
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

/** Wavelength samples and corresponding Strehl ratios. */
export interface StrehlVsWavelengthData {
  fieldIdx: number;
  x: number[];
  y: number[];
  unitX: string;
  unitY: string;
}

/** Geometric-PSF point coordinates and physical units. */
export interface GeoPsfData {
  fieldIdx: number;
  wvlIdx: number;
  x: number[];
  y: number[];
  unitX: string;
  unitY: string;
}

/** One wavelength's spot-diagram point cloud. */
export interface SpotDiagramSeriesData {
  fieldIdx: number;
  wvlIdx: number;
  x: number[];
  y: number[];
  unitX: string;
  unitY: string;
}

/** All wavelength series in a spot diagram. */
export type SpotDiagramData = SpotDiagramSeriesData[];

/** Sagittal and tangential field-curvature curves. */
export interface FieldCurveData {
  wvlIdx: number;
  Sagittal: LineAxisData;
  Tangential: LineAxisData;
  fieldLabels: string[];
  unitX: string;
  unitY: string;
}

/** Astigmatic-separation curve across field. */
export interface AstigmatismCurveData {
  wvlIdx: number;
  Astigmatism: LineAxisData;
  fieldLabels: string[];
  unitX: string;
  unitY: string;
}

/** One wavelength's longitudinal spherical-aberration curve. */
export interface LongitudinalSphericalAberrationSeriesData {
  wvlIdx: number;
  LSA: LineAxisData;
  unitX: string;
  unitY: string;
}

/** All wavelength series in the longitudinal spherical-aberration view. */
export type LongitudinalSphericalAberrationData = LongitudinalSphericalAberrationSeriesData[];

/** Transverse ray-fan axis samples. */
export type RayFanAxisData = FanLineAxisData;

/** Sagittal and tangential transverse fan data for one field and wavelength. */
export interface RayFanSeriesData {
  fieldIdx: number;
  wvlIdx: number;
  Sagittal: RayFanAxisData;
  Tangential: RayFanAxisData;
  unitX: string;
  unitY: string;
}

/** All transverse ray-fan series. */
export type RayFanData = RayFanSeriesData[];

/** OPD-fan axis samples. */
export type OpdFanAxisData = FanLineAxisData;

/** Sagittal and tangential OPD fan data for one field and wavelength. */
export interface OpdFanSeriesData {
  fieldIdx: number;
  wvlIdx: number;
  Sagittal: OpdFanAxisData;
  Tangential: OpdFanAxisData;
  unitX: string;
  unitY: string;
}

/** All OPD-fan series. */
export type OpdFanData = OpdFanSeriesData[];
