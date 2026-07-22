/**
Compatibility export for `MediumCell`.

The implementation lives in `shared/lib/lens-prescription-grid/LensPrescriptionGridCells.tsx` so Lens Editor and Optimization can reuse the same prescription cell UI without importing from `features/`.

The default tooltip copy remains Lens Editor-oriented: `Click to set medium or glass`.
*/
export { MediumCell } from "@/shared/lib/lens-prescription-grid";
