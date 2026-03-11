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
  };
  wavelengths: {
    weights: [number, number][]; // [wavelength in nm, weight][]
    referenceIndex: number;
  };
}

type DecenterConfig = {
  posAndOrientation: "bend" | "dec and return" | "decenter" | "reverse";
  alpha: number,
  beta: number,
  gamma: number,
  offsetX: number,
  offsetY: number,
};

/** Represents a single optical surface in the sequential model. */
export interface Surface {
  label: "Default" | "Stop";
  curvatureRadius: number; // 0 means flat (infinite radius).
  thickness: number;
  medium: string; // can be "air" or "REFL"
  manufacturer: string; // if medium is "air" or "REFL", manufacturer is ""
  semiDiameter: number;
  aspherical?: {
    conicConstant: number;
    polynomialCoefficients?: number[]; // length <= 10
  };
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
  specs: OpticalSpecs;
}

