# `features/lens-editor/lib/photonsToPhotosParser.ts`

## Purpose

Parses Photons to Photos lens prescription `.txt` files into app `OpticalModel` data for import.

## API

- `parsePhotonsToPhotosText(text, lookupMaps?)` returns either:
  - `{ kind: "prime", model }` for single-focal-length files.
  - `{ kind: "zoom", focalLengthChoices, resolve }` for multi-column zoom files; `resolve(choiceIndex)` builds the selected focal-length `OpticalModel`.

## Parsing Rules

- Required sections are `[descriptive data]`, `[variable distances]`, and `[lens data]`; `[constants]` and `[aspherical data]` are optional. `[figure]` and `[notes]` are ignored.
- `Infinity` radii, `AS`, and `CG` radii become flat surfaces (`curvatureRadius: 0`). `Infinity` object distances become `1e10`.
- Lens-data aperture values become `semiDiameter = aperture / 2`.
- Rows with `AS` radius are aperture stops (`label: "Stop"`).
- Glass name/catalog columns take precedence. When lookup maps are provided, special media and catalog glasses resolve case-insensitively to canonical app names. Special media `CaF2`, `Fused silica`, and `Water` use an empty manufacturer, and `fluorite` / `fluorspar` resolve to `CaF2`.
- If lookup maps are provided and a named glass is unsupported, parser falls back to model-glass `nd` / `vd` strings when `nd` is present. Without lookup maps, named glasses keep the legacy behavior: `medium` is the imported glass name and `manufacturer` is the uppercased catalog.
- Without glass names, `nd` and `vd` are preserved as string `medium` and `manufacturer`; blank material data maps to air.
- Variable thickness tokens such as `Bf`, `d5`, and `d12` resolve from the selected variable-distance column.
- `[aspherical data]` rows attach `EvenAspherical` configs to matching surfaces and reject radius disagreement beyond a small tolerance.
- Imported specs use image-space `f/#` (the System Specs UI-supported f-number option), object angle fields `[0, 0.707, 1]`, Fraunhofer d/F/C wavelengths, and `setAutoAperture: "manualAperture"`.
- Photons to Photos `Angle of View` is the full angle of view; imported `specs.field.maxField` is the app Field half-angle (`Angle of View / 2`). `isWideAngle` still uses the original full angle of view and is true when that value is at least 80 degrees.

## Tests

Covered by `photonsToPhotosParser.test.ts` with prime, glass, case-insensitive lookup resolution, special material aliases, unsupported named-glass fallback, fisheye stop, zoom column selection, unresolved variables, missing sections, and aspherical radius disagreement.
