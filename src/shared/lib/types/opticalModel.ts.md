# `shared/lib/types/opticalModel.ts`

## Purpose

Defines all core TypeScript domain types for the optical model, including system specifications, surfaces, and aberration data. This is the single source of truth for types shared across the worker, hooks, and UI.

## Exports
- `DecenterConfig`: shared tilt/decenter configuration for image and surface rows.
- `OpticalModel`: interface for all information (system specs, surfaces, and aperture flag) needed for RayOptics. Includes `setAutoAperture: SetAutoApertureFlag`.
- `SeidelSurfaceBySurfaceData`: per-surface Seidel aberration matrix plus row/column labels.
- `SeidelData`: the shape of data from Rayoptics via the Pyodide worker for 3rd order Seidel aberrations.
- `FocusingResult`: `{ delta_thi: number; metric_value: number }` — result returned by the 4 focusing functions in the worker.
- `AberrationTypeToLabel`: interface for mapping keys in of `transverse`, `wavefront` and `curvature` of 3rd order Seidel aberrations data to labels for UI components.


## Key Conventions

- **`curvatureRadius: 0`** means flat surface (infinite radius of curvature) — used throughout the codebase.
- **`medium: "REFL"`** denotes a reflective surface (mirror).
- **`medium: "CaF2"`** is a special-cased medium.
- `manufacturer` is always `""` when `medium` is `"air"` or `"REFL"`.
- `aspherical` is a discriminated union:
  - `{ kind: "Conic", conicConstant }`
  - `{ kind: "EvenAspherical", conicConstant, polynomialCoefficients }`
- `OpticalModel` extends `Surfaces`, so all surface data is directly on the model object.
- `setAutoAperture: "autoAperture"` tells RayOptics to recompute semi-diameters; `"manualAperture"` preserves them.

## Edge Cases / Error Handling

- `polynomialCoefficients` is required for `kind: "EvenAspherical"` and has a maximum of 10 coefficients.
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
  object: { distance: 1e10 },
  surfaces: [
    { curvatureRadius: 50, thickness: 10, medium: "BK7", manufacturer: "Schott" },
    { curvatureRadius: -50, thickness: 5, medium: "air" },
  ],
  image: { curvatureRadius: 0 },
  setAutoAperture: "autoAperture",
};

// Passing to Pyodide worker
const firstOrderData = await proxy.getFirstOrderData(model);
const layoutImage = await proxy.plotLensLayout(model);
```

Imported by virtually every module. Types are validated by `lib/importSchema.ts` for uploaded files.
