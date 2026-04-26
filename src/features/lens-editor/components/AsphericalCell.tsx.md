# `features/lens-editor/components/AsphericalCell.tsx`

Compatibility export for `AsphericalCell`.

The implementation lives in `shared/lib/lens-prescription-grid/LensPrescriptionGridCells.tsx` so Lens Editor and Optimization can reuse the same prescription cell UI without importing from `features/`.

## Export

```ts
export { AsphericalCell } from "@/shared/lib/lens-prescription-grid";
```

The default tooltip copy remains Lens Editor-oriented: `Click to set aspherical parameters`.
