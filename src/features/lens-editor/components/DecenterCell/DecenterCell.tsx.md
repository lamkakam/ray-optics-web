# `features/lens-editor/components/DecenterCell/DecenterCell.tsx`

Compatibility export for `DecenterCell`.

The implementation lives in `shared/lib/lens-prescription-grid/LensPrescriptionGridCells.tsx` so Lens Editor and Optimization can reuse the same prescription cell UI without importing from `features/`.

## Export

```ts
export { DecenterCell } from "@/shared/lib/lens-prescription-grid";
```

The shared cell displays `None` when no decenter config exists, otherwise the row's `coordinateSystemStrategy` value (`bend`, `dec and return`, `decenter`, or `reverse`). The default tooltip copy remains `Click to open settings for Tilt and Decenter`.
