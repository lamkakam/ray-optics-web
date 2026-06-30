# `shared/lib/lens-prescription-grid/lib/surfaceValueScaling.ts`

## Purpose

Pure scaling policy and helpers for numeric values owned by lens prescription grid object, surface, and image rows. The module centralizes which numeric fields participate in scale formatting, which fields are preserved, and which values are collected for formatting validation.

## Exports

- `OBJECT_DISTANCE_INFINITY_THRESHOLD` — object distances at or above `1e10` are treated as infinity-like and preserved during scale formatting.
- `SURFACE_VALUE_SCALING_POLICY` — central executable policy map for object, image, and normal surface numeric fields. Scaleable leaves are scaler functions; preserved numeric leaves are `undefined`.
- `OBJECT_VALUE_SCALERS` — alias for the object policy, keyed by `Surfaces["object"]` fields. The object row bridge applies the `distance` scaler to grid-row `objectDistance`.
- `IMAGE_VALUE_SCALERS` — alias for the image policy, keyed by `Surfaces["image"]` fields.
- `SURFACE_VALUE_SCALERS` — alias for the surface policy, keyed by `Surface` fields.
- `scaleObjectDistance(distance, factor)` — multiplies finite object distances below the infinity threshold and preserves threshold-or-larger distances.
- `scaleDecenter(decenter, factor)` — multiplies `offsetX`/`offsetY` and preserves angular fields.
- `scaleClearAperture(aperture, factor)` — multiplies aperture offsets and dimensional fields while preserving rectangular rotation.
- `scaleEdgeAperture(aperture, factor)` — multiplies aperture offsets and dimensional fields while preserving rectangular rotation.
- `scaleAspherical(aspherical, factor)` — preserves conic constants, scales toroid sweep radius linearly, and scales polynomial coefficients by coefficient order.
- `scaleObjectSurface(row, factor)` — scales an object row according to the object policy.
- `scaleImageSurface(row, factor)` — scales an image row according to the image policy.
- `scaleNormalSurface(row, factor)` — scales a normal surface row according to the surface policy.
- `scaleSurfaceValueRow(row, factor)` — dispatches to the object, image, or normal surface scaling helper based on `row.kind`.
- `collectSurfaceScalingNumericValues(row)` — collects numeric values from the same centralized policy for finite-number and underflow validation.

## Scaling Policy

- Executable scaling is table-driven through `SURFACE_VALUE_SCALING_POLICY`. Top-level object keys are derived from `Surfaces["object"]`, `Surfaces["image"]`, and `Surface` instead of being duplicated as untyped string lists.
- A policy leaf that is a function transforms the matching value. A policy leaf that is `undefined` preserves the matching value while still including numeric values in validation.
- Linear dimensions multiply by `factor`: object distance below `1e10`, surface and image curvature radius, surface thickness, semi-diameter, decenter offsets, clear aperture offsets and dimensional fields, edge aperture offsets and dimensional fields, and toroid sweep radius.
- Asphere polynomial coefficients divide by `factor ** (order - 1)`.
- `RadialPolynomial` coefficient orders are `1..n`.
- `EvenAspherical`, `XToroid`, and `YToroid` coefficient orders are `2, 4, ...`.
- Dimensionless or angular values are preserved: conic constants, decenter `alpha`/`beta`/`gamma`, rectangular aperture rotation, diffraction grating `lpmm`, and diffraction grating `order`.
- Object distances at or above `1e10` are preserved.

## Validation Collection

`collectSurfaceScalingNumericValues` walks `SURFACE_VALUE_SCALING_POLICY` and collects all numeric values covered by the policy, including preserved values. This keeps finite-number and precision-underflow validation aligned with the same fields that scale formatting recognizes.
