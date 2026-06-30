# `shared/lib/lens-prescription-grid/LensPrescriptionGridCells.tsx`

Reusable prescription grid cell UI that is safe for `shared/` because it depends only on shared primitives.

## Exports

- `LensPrescriptionActionWrapper` — fills an AG Grid cell and calls `onAction` when the non-interactive cell body is clicked.
- `MediumCell` — renders a medium/glass button with configurable tooltip text.
- `ApertureCell` — renders a full-width text action button for aperture settings with configurable tooltip text.
- `AsphericalCell` — renders a full-width text action button for aspherical parameters with configurable tooltip text.
- `DecenterCell` — renders a full-width text action button for tilt/decenter settings with configurable tooltip text.
- `DiffractionGratingCell` — renders a full-width text action button for diffraction grating settings with configurable tooltip text.

## Behavior

- All tooltips use `portal` and `noTouch` for AG Grid compatibility.
- Medium, aspherical, decenter, and diffraction grating tooltip-backed action cells do not apply `touch-action: none`, so native touch scrolling can start over those controls in iOS Safari.
- Medium, aspherical, decenter, and diffraction grating cells use `triggerClassName="flex h-full w-full"` so the tooltip trigger fills the cell action area.
- Medium, aperture, aspherical, decenter, and diffraction grating action cell text renders on a single line and uses an ellipsis when it exceeds the available cell width.
- Empty aspherical, decenter, and diffraction grating values display `None`.
- Aperture values are formatted from both `clear_aperture` and `edge_aperture`: missing clear aperture and centered circular clear aperture display `Default` when edge aperture is missing/default; circular clear aperture with nonzero offset displays `Cir offset (<x>, <y>)`; annular clear aperture displays `Annu obs <radius>` with an optional offset suffix; explicit circular edge aperture appends `; Edge Cir <radius>` with an optional offset suffix.
- Aspherical values display the shared asphere type label (`Conic`, `Even Aspherical`, `Radial Polynomial`, `X Toroid`, `Y Toroid`).
- Decenter values display `coordinateSystemStrategy` directly.
- Diffraction grating values display `${lpmm} lp/mm`.
- Default tooltip copy preserves the Lens Editor wording.
- Optimization passes view-oriented tooltip copy through the shared column builders.
