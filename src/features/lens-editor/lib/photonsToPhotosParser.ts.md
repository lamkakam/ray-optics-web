# `features/lens-editor/lib/photonsToPhotosParser.ts`

## Purpose

Parses Photons to Photos lens prescription `.txt` files into app `OpticalModel` data for import.

## API

- `parsePhotonsToPhotosText(text, lookupMaps?)` returns either:
  - `{ kind: "prime", model }` for single-focal-length files.
  - `{ kind: "zoom", focalLengthChoices, resolve }` for multi-column zoom files; `resolve(choiceIndex)` builds the selected focal-length `OpticalModel`.

## Parsing Rules

- Required sections are `[descriptive data]`, `[variable distances]`, and `[lens data]`; `[constants]` and `[aspherical data]` are optional. `[figure]` and `[notes]` are ignored.
- `Infinity`, `CG`, and `FS` radii become flat default surfaces (`curvatureRadius: 0`). `AS` radii become flat aperture-stop surfaces. `Infinity` object distances and apertures become `1e10`.
- Lens-data aperture values become `semiDiameter = aperture / 2`.
- Rows with `AS` radius are aperture stops (`label: "Stop"`). Rows with `FS` radius are flat non-stop surfaces (`label: "Default"`).
- Glass name/catalog columns take precedence. When lookup maps are provided, special media and catalog glasses resolve case-insensitively to canonical app names. Special media `CaF2`, `Fused silica`, and `Water` use an empty manufacturer, and `fluorite` / `fluorspar` resolve to `CaF2`.
- Unsupported named glasses never import the literal glass name as the medium. After lookup failure, with or without lookup maps, parser falls back to model-glass data: `nd` becomes `medium`, `vd` becomes `manufacturer`, blank `vd` becomes an empty manufacturer, and blank `nd` maps to air with an empty manufacturer.
- Without glass names, the same model-glass fallback is used: `nd` and `vd` are preserved as string `medium` and `manufacturer`; blank material data maps to air.
- Variable thickness tokens such as `Bf`, `d5`, and `d12` resolve from the selected variable-distance column.
- Object distance normally comes from variable distance `d0` and uses air with an empty manufacturer. When `d0` resolves to `0`, the object is derived from the first parsed surface with non-zero `thickness`: `distance` copies that surface thickness, and `medium` / `manufacturer` copy the already resolved surface material, including unsupported-name model-glass fallback. That source surface and every surface before it are removed from imported `surfaces`. If every parsed surface has zero thickness, the object falls back to `{ distance: 0, medium: "air", manufacturer: "" }` and no surfaces are removed.
- `[aspherical data]` rows attach `EvenAspherical` configs to matching surfaces and reject radius disagreement beyond a small tolerance.
- Imported specs use Fraunhofer d/F/C wavelengths, field samples `[0, 0.707, 1]`, and `setAutoAperture: "manualAperture"`.
- When `F-Number` is present, imported pupil specs use image-space `f/#`. When `F-Number` is absent, `NA` is required and imported pupil specs use object-space `NA`.
- When `Angle of View` is present, it is the full angle of view; imported `specs.field.maxField` is the app Field half-angle (`Angle of View / 2`). `isWideAngle` still uses the original full angle of view and is true when that value is at least 80 degrees.
- When `Angle of View` is absent, `Image Height` is required and imported field specs use image-space height with `maxField = Image Height / 2`. For this fallback, `isWideAngle` is true when the imported pupil is `NA >= 0.5`; otherwise it is false.

## Tests

Covered by `photonsToPhotosParser.test.ts` with prime, microscope NA/Image Height fallback, flat `FS` rows, glass, case-insensitive lookup resolution, special material aliases, unsupported named-glass fallback, fisheye stop, zoom column selection, unresolved variables, missing sections, and aspherical radius disagreement.
