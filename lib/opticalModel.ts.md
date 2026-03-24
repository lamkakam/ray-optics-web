# `lib/opticalModel.ts`

## Purpose

Defines all core TypeScript domain types for the optical model, including system specifications, surfaces, and aberration data. This is the single source of truth for types shared across the worker, hooks, and UI.

## Exports
- `OpticalModel`: interface for all information (system specs, surfaces, and aperture flag) needed for RayOptics. Includes `setAutoAperture: SetAutoApertureFlag`.
- `SeidelData`: the shape of data from Rayoptics via the Pyodide worker for 3rd order Seidel aberrations.
- `AberrationTypeToLabel`: interface for mapping keys in of `transverse`, `wavefront` and `curvature` of 3rd order Seidel aberrations data to labels for UI components.


## Key Conventions

- **`curvatureRadius: 0`** means flat surface (infinite radius of curvature) — used throughout the codebase.
- **`medium: "REFL"`** denotes a reflective surface (mirror).
- **`medium: "CaF2"`** is a special-cased medium.
- `manufacturer` is always `""` when `medium` is `"air"` or `"REFL"`.
- `OpticalModel` extends `Surfaces`, so all surface data is directly on the model object.
- `setAutoAperture: "autoAperture"` tells RayOptics to recompute semi-diameters; `"manualAperture"` preserves them.

## Edge Cases / Error Handling

- `polynomialCoefficients` in the aspherical config has a maximum of 10 coefficients.
- `fields` in `OpticalSpecs.field` may be absolute or relative values depending on `isRelative`.
- `referenceIndex` in `wavelengths` is a zero-based index into `weights`; callers must ensure it is in range.

## Usages

- Imported by virtually every module and UI components.
- `OpticalModel` is the shape validated by `lib/importSchema.ts` for JSON config files uploaded by users.
