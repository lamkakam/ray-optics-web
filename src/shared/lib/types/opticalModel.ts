/**
# `shared/lib/types/opticalModel.ts`

## Key Conventions

- **`curvatureRadius: 0`** means flat surface (infinite radius of curvature) — used throughout the codebase.
- **`medium: "REFL"`** denotes a reflective surface (mirror).
- **`medium: "CaF2"`** is a special-cased medium.
- `manufacturer` is always `""` when `medium` is `"air"` or `"REFL"`.
- `Surfaces["object"]` stores `distance`, `medium`, and `manufacturer`; object medium must be non-reflective.
- `aspherical` is a discriminated union:
  - `{ kind: "Conic", conicConstant }`
  - `{ kind: "EvenAspherical", conicConstant, polynomialCoefficients }`
  - `{ kind: "RadialPolynomial", conicConstant, polynomialCoefficients }`
  - `{ kind: "XToroid", conicConstant, toricSweepRadiusOfCurvature, polynomialCoefficients }`
  - `{ kind: "YToroid", conicConstant, toricSweepRadiusOfCurvature, polynomialCoefficients }`
- `diffractionGrating`, when present on a surface, is `{ lpmm: number; order: number }`.
- `clear_aperture`, when present on a surface, records the clear aperture shape and signed X/Y offsets. Circular and annular outer clear aperture radii are derived from `semiDiameter`; annular clear apertures additionally store `obstructionRadius`; rectangular clear apertures store `xHalfWidth`, `yHalfWidth`, and `rotation`.
- `edge_aperture`, when present on a surface, records an explicit circular edge aperture radius or rectangular half widths, rotation, and signed X/Y offsets. When omitted, the edge aperture follows the clear aperture.
- `OpticalModel` extends `Surfaces`, so all surface data is directly on the model object.
- `setAutoAperture: "autoAperture"` tells RayOptics to recompute semi-diameters; `"manualAperture"` preserves them.
*/
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

export type DiffractionGrating = {
  lpmm: number,
  order: number,
};

type BaseAperture = {
  offsetX: number,
  offsetY: number,
};

export type AnnularAperture = {
  shape: "annular",
  obstructionRadius: number,
};

export type RectangularAperture = {
  shape: "rectangular",
  xHalfWidth: number,
  yHalfWidth: number,
  rotation: number,
};

export type ClearAperture = ({
  shape: "circular",
} | AnnularAperture | RectangularAperture) & BaseAperture;

export type EdgeAperture = ({
  shape: "circular",
  radius: number,
} | RectangularAperture) & BaseAperture;

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
  clear_aperture?: ClearAperture;
  edge_aperture?: EdgeAperture;
  aspherical?: AsphericalConfig;
  decenter?: DecenterConfig,
  diffractionGrating?: DiffractionGrating,
}

export interface Surfaces {
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

/** Complete optical model returned from the worker. */
/**
## Purpose

Defines core TypeScript domain types for the optical model, including system specifications, surfaces, and aspherical surface configuration. Feature-owned analysis, focusing, Seidel, Zernike, and glass-map payload types live under their owning feature directories.

## Exports
- `DecenterConfig`: shared tilt/decenter configuration for image and surface rows.
- `DiffractionGrating`: surface diffraction grating configuration with `lpmm` and integer `order`.
- `AnnularAperture`: annular clear aperture shape data with `shape: "annular"` and `obstructionRadius`.
- `RectangularAperture`: rectangular aperture shape data with `shape: "rectangular"`, `xHalfWidth`, `yHalfWidth`, and `rotation`.
- `ClearAperture`: clear aperture configuration. Supports circular, annular, and rectangular clear apertures; all include `offsetX` and `offsetY`.
- `EdgeAperture`: edge aperture configuration. Supports circular and rectangular explicit edge apertures; all include `offsetX` and `offsetY`.
- `OpticalModel`: interface for all information (system specs, surfaces, and aperture flag) needed for RayOptics. Includes `setAutoAperture: SetAutoApertureFlag`.

## Edge Cases / Error Handling

- `polynomialCoefficients` is required for `kind: "EvenAspherical"`, `kind: "RadialPolynomial"`, `kind: "XToroid"`, and `kind: "YToroid"`, and has a maximum of 10 coefficients.
- `toricSweepRadiusOfCurvature` is required for toroidal kinds.
- `fields` in `OpticalSpecs.field` may be absolute or relative values depending on `isRelative`.
- `referenceIndex` in `wavelengths` is a zero-based index into `weights`; callers must ensure it is in range.

## Usages

```ts
import type { OpticalModel, OpticalSpecs, Surface } from "@/shared/lib/types/opticalModel";

// Creating a new optical model
const model: OpticalModel = {
  specs: {
    pupil: { space: "object", type: "epd", value: 25 },
    field: { space: "object", type: "height", fields: [0, 14, 20], isRelative: true },
    wavelengths: { weights: [[546.073, 1]], referenceIndex: 0 },
  },
  object: { distance: 1e10, medium: "air", manufacturer: "" },
  surfaces: [
    { curvatureRadius: 50, thickness: 10, medium: "BK7", manufacturer: "Schott" },
    { curvatureRadius: -50, thickness: 5, medium: "air" },
  ],
  image: { curvatureRadius: 0 },
  setAutoAperture: "autoAperture",
};

// Passing to Pyodide worker
const firstOrderData = await proxy.getFirstOrderData(model);
const layoutImage = await proxy.plotLensLayout(model, false);
```

Imported by modules that need the core optical model contract. Types are validated by `lib/importSchema.ts` for uploaded files.
*/
export interface OpticalModel extends Surfaces {
  setAutoAperture: SetAutoApertureFlag;
  specs: OpticalSpecs;
}
