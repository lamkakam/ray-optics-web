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

/** Represents a single optical surface in the sequential model. */
export interface Surface {
  label: "Default" | "Object" | "Stop";
  curvatureRadius: number; // 0 means flat (infinite radius). Ignored by "Object
  thickness: number;
  medium: string; // Ignored by "Object". Can be "air" or "REFL"
  manufacturer: string; // Ignored by "Object". If medium is "air" or "REFL", manufacturer is also "air"
  semiDiameter?: number; // Ignored by "Object"
  aspherical?: { // Ignored by "Object"
    conicConstant: number;
    polynomialCoefficients?: number[]; // length <= 10
  };
}

/** Complete optical model returned from the worker. */
export interface OpticalModel {
  specs: OpticalSpecs;
  surfaces: Surface[];
}

