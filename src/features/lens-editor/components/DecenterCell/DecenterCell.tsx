/**
 * Compatibility export for `DecenterCell`.
 *
 * @remarks
 * The implementation lives in `shared/lib/lens-prescription-grid/LensPrescriptionGridCells.tsx` so Lens Editor and Optimization can reuse the same prescription cell UI without importing from `features/`.
 *
 * The shared cell displays `None` when no decenter config exists, otherwise the row's `coordinateSystemStrategy` value (`bend`, `dec and return`, `decenter`, or `reverse`). The default tooltip copy remains `Click to open settings for Tilt and Decenter`.
 */
export { DecenterCell } from "@/shared/lib/lens-prescription-grid";
