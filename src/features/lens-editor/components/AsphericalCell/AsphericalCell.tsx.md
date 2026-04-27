# `features/lens-editor/components/AsphericalCell/AsphericalCell.tsx`

Compatibility export for `AsphericalCell`.

The implementation lives in `shared/lib/lens-prescription-grid/LensPrescriptionGridCells.tsx` so Lens Editor and Optimization can reuse the same prescription cell UI without importing from `features/`.

## Export

```ts
export { AsphericalCell } from "@/shared/lib/lens-prescription-grid";
```

The shared cell displays `None` when no aspherical config exists, otherwise the shared asphere type label. The default tooltip copy remains Lens Editor-oriented: `Click to set aspherical parameters`.
