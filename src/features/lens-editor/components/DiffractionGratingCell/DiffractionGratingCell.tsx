/**
Compatibility export for `DiffractionGratingCell`.

The implementation lives in `shared/lib/lens-prescription-grid/LensPrescriptionGridCells.tsx` so Lens Editor and Optimization can reuse the same prescription cell UI without importing from `features/`.

The shared cell displays `None` when no grating exists, otherwise `${lpmm} lp/mm`. The default tooltip copy remains Lens Editor-oriented: `Click to set diffraction grating`.
*/
export { DiffractionGratingCell } from "@/shared/lib/lens-prescription-grid";
