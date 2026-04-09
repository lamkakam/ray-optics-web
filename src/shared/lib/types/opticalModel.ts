import type { ReactNode } from "react";
import type { SetAutoApertureFlag } from "@/shared/lib/utils/apertureFlag";
export type { SetAutoApertureFlag };


/** Optical system specifications. */
export interface OpticalSpecs {
  pupil: {
    space: "object" | "image"; // whether the value is defined over object or image space
    type: "epd" | "f/#" | "NA"; // match with rayoptics PupilSpec
    value: number;
  };
  field: {
    space: "object" | "image";
    type: "angle" | "height";
    maxField: number; // must be absolute number
    fields: number[];
    isRelative: boolean; // if true, the fields are relative to maxField
    // if true, a more robust built-in ray aiming method is used to determine the centre of the stop
    // for the chief ray in a wide-angled field
    isWideAngle?: boolean; 
  };
  wavelengths: {
    weights: [number, number][]; // [wavelength in nm, weight][]
    referenceIndex: number;
  };
}

export type DecenterConfig = {
  coordinateSystemStrategy: "bend" | "dec and return" | "decenter" | "reverse";
  alpha: number,
  beta: number,
  gamma: number,
  offsetX: number,
  offsetY: number,
};

export type AsphericalPolynomialCoeffs = number[];

type AsphericalConfigMap = {
  "Conic": { conicConstant: number },
  // length <= 10
  "EvenAspherical": { conicConstant: number, polynomialCoefficients: AsphericalPolynomialCoeffs },
  "RadialPolynomial": { conicConstant: number, polynomialCoefficients: AsphericalPolynomialCoeffs },
  "XToroid": { toricSweepRadiusOfCurvature: number, conicConstant: number, polynomialCoefficients: AsphericalPolynomialCoeffs },
  "YToroid": { toricSweepRadiusOfCurvature: number, conicConstant: number, polynomialCoefficients: AsphericalPolynomialCoeffs },
};

type AsphericalConfigConstructor<T extends keyof AsphericalConfigMap> = {
  [K in keyof AsphericalConfigMap]: { kind: K } & AsphericalConfigMap[K];
}[T];

type AsphericalConfig = 
  | AsphericalConfigConstructor<"Conic">
  | AsphericalConfigConstructor<"EvenAspherical">
  | AsphericalConfigConstructor<"RadialPolynomial">
  | AsphericalConfigConstructor<"XToroid">
  | AsphericalConfigConstructor<"YToroid">;

export type AsphericalType = AsphericalConfig["kind"];

/** Represents a single optical surface in the sequential model. */
export interface Surface {
  label: "Default" | "Stop";
  curvatureRadius: number; // 0 means flat (infinite radius).
  thickness: number;
  medium: string; // can be "air" or "REFL"
  manufacturer: string; // if medium is "air" or "REFL", manufacturer is ""
  semiDiameter: number;
  aspherical?: AsphericalConfig;
  decenter?: DecenterConfig,
}

export interface Surfaces {
  object: {
    distance: number,
  },
  image: {
    curvatureRadius: number, // 0 means flat (infinite radius)
    decenter?: DecenterConfig,
  },
  surfaces: Surface[];
}

/** Complete optical model returned from the worker. */
export interface OpticalModel extends Surfaces {
  setAutoAperture: SetAutoApertureFlag;
  specs: OpticalSpecs;
}


export interface SeidelSurfaceBySurfaceData {
  aberrTypes: string[];    // ['S-I', 'S-II', 'S-III', 'S-IV', 'S-V']
  surfaceLabels: string[];  // surface labels + 'sum'
  data: number[][];   // 5 × N matrix (row = aberration type, col = surface)
}

export interface SeidelData {
  surfaceBySurface: SeidelSurfaceBySurfaceData;
  transverse: Record<string, number>;  // TSA, TCO, TAS, SAS, PTB, DST
  wavefront: Record<string, number>;   // W040, W131, W222, W220, W311
  curvature: Record<string, number>;   // TCV, SCV, PCV
}

export interface FocusingResult {
  delta_thi: number;
  metric_value: number;
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

export interface AberrationTypeToLabel extends Record<string, ReactNode> {
  TSA: ReactNode;
  TCO: ReactNode;
  TAS: ReactNode;
  SAS: ReactNode;
  PTB: ReactNode;
  DST: ReactNode;
  W040: ReactNode;
  W131: ReactNode;
  W222: ReactNode;
  W220: ReactNode;
  W311: ReactNode;
  TCV: ReactNode;
  SCV: ReactNode;
  PCV: ReactNode;
}
