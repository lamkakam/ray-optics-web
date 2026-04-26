# `shared/lib/lens-prescription-grid/lensPrescriptionGridColumns.tsx`

Shared column and AG Grid configuration for lens prescription grids.

## Exports

- `numberValueParser` — accepts finite decimal/scientific notation input and restores `oldValue` for blank or invalid input.
- `lensPrescriptionGridDefaultColDef` — `{ sortable: false, suppressMovable: true }`.
- `LENS_PRESCRIPTION_GRID_DOM_LAYOUT` — `"autoHeight"`.
- `createSurfaceColumn`
- `createRadiusOfCurvatureColumn`
- `createThicknessColumn`
- `createMediumColumn`
- `createSemiDiameterColumn`
- `createAsphericalColumn`
- `createDecenterColumn`
- `createDiffractionGratingColumn`
- `createLensPrescriptionCommonColumns`

## Design

Builders accept `getGridRow(data)` so feature grids can adapt their own row model to `GridRow` without coupling `shared/` to feature state. Modal and edit behavior is injected through optional callbacks. When edit callbacks are omitted, numeric and select columns remain read-only.

`createLensPrescriptionCommonColumns` returns the common column order used by the Lens Editor. Optimization uses the individual builders so its local `Var.` columns can stay interleaved after Radius, Thickness, and Asph.
