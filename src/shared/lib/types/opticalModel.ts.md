# `shared/lib/types/opticalModel.ts`

## Purpose

Defines core TypeScript domain types for the optical model, including system specifications, surfaces, and aspherical surface configuration. Feature-owned analysis, focusing, Seidel, Zernike, and glass-map payload types live under their owning feature directories.

## Exports
- `DecenterConfig`: shared tilt/decenter configuration for image and surface rows.
- `DiffractionGrating`: surface diffraction grating configuration with `lpmm` and integer `order`.
- `OpticalModel`: interface for all information (system specs, surfaces, and aperture flag) needed for RayOptics. Includes `setAutoAperture: SetAutoApertureFlag`.
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
- `OpticalModel` extends `Surfaces`, so all surface data is directly on the model object.
- `setAutoAperture: "autoAperture"` tells RayOptics to recompute semi-diameters; `"manualAperture"` preserves them.

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
