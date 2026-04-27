# `shared/lib/lens-prescription-grid/LensPrescriptionGridCells.tsx`

Reusable prescription grid cell UI that is safe for `shared/` because it depends only on shared primitives.

## Exports

- `LensPrescriptionActionWrapper` — fills an AG Grid cell and calls `onAction` when the non-interactive cell body is clicked.
- `MediumCell` — renders a medium/glass button with configurable tooltip text.
- `AsphericalCell` — renders a full-width text action button for aspherical parameters with configurable tooltip text.
- `DecenterCell` — renders a full-width text action button for tilt/decenter settings with configurable tooltip text.
- `DiffractionGratingCell` — renders a full-width text action button for diffraction grating settings with configurable tooltip text.

## Behavior

- All tooltips use `portal` and `noTouch` for AG Grid compatibility.
- Aspherical, decenter, and diffraction grating cells use `triggerClassName="flex h-full w-full"` so the tooltip trigger fills the cell action area.
- Empty aspherical, decenter, and diffraction grating values display `None`.
- Aspherical values display the shared asphere type label (`Conic`, `Even Aspherical`, `Radial Polynomial`, `X Toroid`, `Y Toroid`).
- Decenter values display `coordinateSystemStrategy` directly.
- Diffraction grating values display `${lpmm} lp/mm`.
- Default tooltip copy preserves the Lens Editor wording.
- Optimization passes view-oriented tooltip copy through the shared column builders.
