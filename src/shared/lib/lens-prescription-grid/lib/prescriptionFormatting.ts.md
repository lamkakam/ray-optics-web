# `shared/lib/lens-prescription-grid/lib/prescriptionFormatting.ts`

## Purpose

Pure formatting helpers for lens prescription grid rows. The module does not read or mutate Zustand state; callers pass rows in and receive either a full candidate row array or an error.

## Exports

- `buildScaleSurfaceOptions(rows)` — returns selector options from `Object` through each surface and `Image`.
- `buildReverseSurfaceOptions(rows)` — returns selector options from `Object` through the last 1-based surface; `Image` is intentionally excluded.
- `scaleRows(rows, { first, last, factor })` — scales selected prescription rows.
- `reverseRows(rows, { first, last })` — reverses selected surface rows and boundary gaps.
- `formatPrescriptionRows(rows, options)` — validates selection/factor, builds the candidate array, and rejects invalid or overflowing numeric results atomically.

## Scale Behavior

- `first` and `last` are selector indices: `0` for Object, `1..n` for surfaces, and `n + 1` for Image.
- Surface `curvatureRadius`, `thickness`, `semiDiameter`, and decenter `offsetX`/`offsetY` are multiplied by `factor`.
- Image `curvatureRadius` and image decenter offsets are multiplied when Image is in the selected range.
- Object distance is multiplied only when it is below `1e6`; larger object distances are preserved.
- Toroid sweep radius is multiplied for `XToroid`/`YToroid`.
- Radial Polynomial coefficients use orders `1..10`; other coefficient-bearing aspheres use even orders `2..20`. Each coefficient is divided by `factor ** (order - 1)`.

## Reverse Behavior

- `first` and `last` use the same selector indices, except Image is invalid.
- `last` must be strictly after `first`.
- Reversed surface rows keep surface-owned data with the surface: semi-diameter, asphere, decenter, diffraction grating, and label.
- Gap-owned data moves with the reversed gap: object distance or surface thickness, plus `medium` and `manufacturer`.
- Curvature radius is multiplied by `-1` for each included surface.
- Boundary gaps are reversed with the selected span: object distance or the preceding surface thickness is the leading gap, and the selected surfaces' thickness values complete the gap list.
- Reversing `Object` through the last surface sets image `curvatureRadius` to `0`.

## Validation

`formatPrescriptionRows` rejects without mutation when the selection is invalid, the scale factor is not positive finite, or any numeric value in the candidate rows is `NaN`, infinite, or has `Math.abs(value) > Number.MAX_VALUE`.
