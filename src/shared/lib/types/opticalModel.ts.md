# `shared/lib/types/opticalModel.ts`

## Purpose

Defines all core TypeScript domain types for the optical model, including system specifications, surfaces, and aberration data. This is the single source of truth for types shared across the worker, hooks, and UI.

## Exports
- `DecenterConfig`: shared tilt/decenter configuration for image and surface rows.
- `DiffractionGrating`: surface diffraction grating configuration with `lpmm` and integer `order`.
- `OpticalModel`: interface for all information (system specs, surfaces, and aperture flag) needed for RayOptics. Includes `setAutoAperture: SetAutoApertureFlag`.
- `SeidelSurfaceBySurfaceData`: per-surface Seidel aberration matrix plus row/column labels.
- `SeidelData`: the shape of data from Rayoptics via the Pyodide worker for 3rd order Seidel aberrations.
- `FocusingResult`: `{ delta_thi: number; metric_value: number }` — result returned by the 4 focusing functions in the worker.
- `DiffractionPsfData`: typed diffraction PSF axes and intensity grid returned by the Pyodide worker for the ECharts-based Diffraction PSF view.
- `WavefrontMapData`: typed wavefront-map axes and OPD grid returned by the Pyodide worker for the ECharts-based Wavefront Map view.
- `GeoPsfData`: typed geometric-PSF point cloud returned by the Pyodide worker for the ECharts-based Geometric PSF view.
- `RayFanAxisData`: paired `x/y` samples for one transverse ray-fan axis.
- `RayFanSeriesData`: one wavelength-group ray-fan payload returned by the Pyodide worker, carrying both `Tangential` and `Sagittal` curves.
- `RayFanData`: `RayFanSeriesData[]` for all wavelengths of the selected field.
- `OpdFanAxisData`: paired `x/y` samples for one OPD fan axis.
- `OpdFanSeriesData`: one wavelength-group OPD fan payload returned by the Pyodide worker, carrying both `Tangential` and `Sagittal` curves.
- `OpdFanData`: `OpdFanSeriesData[]` for all wavelengths of the selected field.
- `SpotDiagramSeriesData`: one wavelength-group point cloud returned by the Pyodide worker for the ECharts-based Spot Diagram view.
- `SpotDiagramData`: `SpotDiagramSeriesData[]` for all wavelengths of the selected field.
- `AberrationTypeToLabel`: interface for mapping keys in of `transverse`, `wavefront` and `curvature` of 3rd order Seidel aberrations data to labels for UI components.


## Key Conventions

- **`curvatureRadius: 0`** means flat surface (infinite radius of curvature) — used throughout the codebase.
- **`medium: "REFL"`** denotes a reflective surface (mirror).
- **`medium: "CaF2"`** is a special-cased medium.
- `manufacturer` is always `""` when `medium` is `"air"` or `"REFL"`.
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
- `DiffractionPsfData.z` is a rectangular intensity grid whose outer dimension matches `x.length` and inner dimension matches `y.length`.
- `WavefrontMapData.z` is a rectangular OPD grid whose outer dimension matches `y.length` and inner dimension matches `x.length`; missing samples are represented as `undefined` on the TypeScript side.
- `GeoPsfData.x` and `GeoPsfData.y` are paired image-plane point coordinates and should be consumed as a point cloud.
- `RayFanData` is grouped by wavelength. Each series entry exposes both `Tangential` and `Sagittal` curves under the same `wvlIdx` so the UI can render two synchronized subplots with a shared legend and correct wavelength labels.
- `OpdFanData` is grouped by wavelength. Each series entry exposes both `Tangential` and `Sagittal` curves under the same `wvlIdx` so the UI can render two synchronized subplots with a shared legend.
- `SpotDiagramData` is grouped by wavelength. Each series entry exposes its own `wvlIdx` so the UI can label series with the actual wavelength value from the optical model rather than the wavelength index.

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
const layoutImage = await proxy.plotLensLayout(model, false);
```

Imported by virtually every module. Types are validated by `lib/importSchema.ts` for uploaded files.
