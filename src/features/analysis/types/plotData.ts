export interface LineAxisData {
  x: number[];
  y: number[];
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
  naTangential: number;
  naSagittal: number;
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

export type RayFanAxisData = LineAxisData;

export interface RayFanSeriesData {
  fieldIdx: number;
  wvlIdx: number;
  Sagittal: RayFanAxisData;
  Tangential: RayFanAxisData;
  unitX: string;
  unitY: string;
}

export type RayFanData = RayFanSeriesData[];

export type OpdFanAxisData = LineAxisData;

export interface OpdFanSeriesData {
  fieldIdx: number;
  wvlIdx: number;
  Sagittal: OpdFanAxisData;
  Tangential: OpdFanAxisData;
  unitX: string;
  unitY: string;
}

export type OpdFanData = OpdFanSeriesData[];
