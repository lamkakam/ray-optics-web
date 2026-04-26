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

export interface RayFanAxisData {
  x: number[];
  y: number[];
}

export interface RayFanSeriesData {
  fieldIdx: number;
  wvlIdx: number;
  Sagittal: RayFanAxisData;
  Tangential: RayFanAxisData;
  unitX: string;
  unitY: string;
}

export type RayFanData = RayFanSeriesData[];

export interface OpdFanAxisData {
  x: number[];
  y: number[];
}

export interface OpdFanSeriesData {
  fieldIdx: number;
  wvlIdx: number;
  Sagittal: OpdFanAxisData;
  Tangential: OpdFanAxisData;
  unitX: string;
  unitY: string;
}

export type OpdFanData = OpdFanSeriesData[];
