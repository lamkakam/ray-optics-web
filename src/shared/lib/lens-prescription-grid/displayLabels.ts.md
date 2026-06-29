# `shared/lib/lens-prescription-grid/displayLabels.ts`

Shared display labels for modal-backed lens prescription grid text action cells.

## Exports

- `EMPTY_LENS_PRESCRIPTION_CELL_LABEL` — `"None"` for absent optional prescription configuration.
- `ASPHERICAL_TYPE_LABELS` — maps each `AsphericalType` to its UI label: `Conic`, `Even Aspherical`, `Radial Polynomial`, `X Toroid`, and `Y Toroid`.
- `ASPHERICAL_TYPE_OPTIONS` — select options derived from `ASPHERICAL_TYPE_LABELS` so the grid and `AsphericalModal` cannot drift.
- `formatApertureLabel(clearAperture, edgeAperture)` — returns compact aperture text for the grid's Aperture cell. A missing clear aperture and a centered circular clear aperture both display as `Default` when the edge aperture is missing/default. A nonzero circular clear aperture offset displays `Cir offset (<x>, <y>)`. Annular clear apertures display `Annu obs <radius>` and append `, offset (<x>, <y>)` when offset. Explicit circular edge apertures append `; Edge Cir <radius>` and append `, offset (<x>, <y>)` when offset.
- `formatAsphericalLabel(aspherical)` — returns the asphere type label or `None`.
- `formatDecenterLabel(decenter)` — returns `coordinateSystemStrategy` or `None`.
- `formatDiffractionGratingLabel(diffractionGrating)` — returns `${lpmm} lp/mm` or `None`.
