/**
 * Core sequential optical-model contracts. Across the model, curvature radius zero
 * means a flat surface and medium `REFL` denotes reflection.
 */
import type { SetAutoApertureFlag } from "@/shared/lib/utils/apertureFlag";
export type { SetAutoApertureFlag };


/** Optical system specifications. */
export interface OpticalSpecs {
  /** Pupil definition in object or image space. */
  pupil: {
    space: "object" | "image"; // whether the value is defined over object or image space
    type: "epd" | "f/#" | "NA"; // match with rayoptics PupilSpec
    value: number;
  };
  /** Absolute or relative field samples and optional wide-angle ray aiming. */
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
  /** Wavelength/weight pairs and their zero-based reference index. */
  wavelengths: {
    weights: [number, number][]; // [wavelength in nm, weight][]
    referenceIndex: number;
  };
}

/** Surface orientation and signed positional offset. */
export type DecenterConfig = {
  coordinateSystemStrategy: "bend" | "dec and return" | "decenter" | "reverse";
  alpha: number,
  beta: number,
  gamma: number,
  offsetX: number,
  offsetY: number,
};

/** Surface grating density and diffraction order. */
export type DiffractionGrating = {
  lpmm: number,
  order: number,
};

type BaseAperture = {
  offsetX: number,
  offsetY: number,
};

/** Annular aperture whose outer radius comes from the surface semi-diameter. */
export type AnnularAperture = {
  shape: "annular",
  obstructionRadius: number,
};

/** Rotated rectangular aperture dimensions. */
export type RectangularAperture = {
  shape: "rectangular",
  xHalfWidth: number,
  yHalfWidth: number,
  rotation: number,
};

/** Circular, annular, or rectangular clear aperture with signed offsets. */
export type ClearAperture = ({
  shape: "circular",
} | AnnularAperture | RectangularAperture) & BaseAperture;

/** Explicit circular or rectangular edge aperture; omission means follow the clear aperture. */
export type EdgeAperture = ({
  shape: "circular",
  radius: number,
} | RectangularAperture) & BaseAperture;

/** At most ten polynomial coefficients for coefficient-bearing aspheres. */
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

/** Discriminated conic, polynomial, or toroidal asphere configuration. */
type AsphericalConfig = 
  | AsphericalConfigConstructor<"Conic">
  | AsphericalConfigConstructor<"EvenAspherical">
  | AsphericalConfigConstructor<"RadialPolynomial">
  | AsphericalConfigConstructor<"XToroid">
  | AsphericalConfigConstructor<"YToroid">;

/** Supported aspherical configuration discriminators. */
export type AsphericalType = AsphericalConfig["kind"];

/** Represents a single optical surface in the sequential model. */
export interface Surface {
  label: "Default" | "Stop";
  curvatureRadius: number; // 0 means flat (infinite radius).
  thickness: number;
  medium: string; // can be "air" or "REFL"
  /** Empty when the medium is air or reflective. */
  manufacturer: string;
  semiDiameter: number;
  /** Clear aperture; circular and annular outer radii come from `semiDiameter`. */
  clear_aperture?: ClearAperture;
  /** Explicit edge aperture, or `undefined` to follow the clear aperture. */
  edge_aperture?: EdgeAperture;
  /** Optional discriminated aspherical surface configuration. */
  aspherical?: AsphericalConfig;
  decenter?: DecenterConfig,
  diffractionGrating?: DiffractionGrating,
}

/** Object plane, ordered physical surfaces, and image plane. */
export interface Surfaces {
  /** Object-space gap and non-reflective medium. */
  object: {
    distance: number,
    medium: Exclude<string, "REFL" | "refl">,
    manufacturer: string,
  },
  image: {
    curvatureRadius: number, // 0 means flat (infinite radius)
    decenter?: DecenterConfig,
  },
  surfaces: Surface[];
}

/** Complete sequential optical model validated at upload boundaries by `importSchema.ts`. */
export interface OpticalModel extends Surfaces {
  /** Whether RayOptics recomputes semi-diameters or preserves manual values. */
  setAutoAperture: SetAutoApertureFlag;
  specs: OpticalSpecs;
}
