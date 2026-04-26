# `shared/lib/lens-prescription-grid/LensPrescriptionGridCells.tsx`

Reusable prescription grid cell UI that is safe for `shared/` because it depends only on shared primitives.

## Exports

- `LensPrescriptionActionWrapper` — fills an AG Grid cell and calls `onAction` when the non-interactive cell body is clicked.
- `MediumCell` — renders a medium/glass button with configurable tooltip text.
- `AsphericalCell` — renders the shared `SetButton` for aspherical parameters with configurable tooltip text.
- `DecenterCell` — renders the shared `SetButton` for tilt/decenter settings with configurable tooltip text.
- `DiffractionGratingCell` — renders the shared `SetButton` for diffraction grating settings with configurable tooltip text.

## Behavior

- All tooltips use `portal` and `noTouch` for AG Grid compatibility.
- Default tooltip copy preserves the Lens Editor wording.
- Optimization passes view-oriented tooltip copy through the shared column builders.
