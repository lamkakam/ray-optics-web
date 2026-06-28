# `shared/lib/lens-prescription-grid/lensPrescriptionGridColumns.tsx`

Shared column and AG Grid configuration for lens prescription grids.

## Exports

- `numberValueParser` — accepts finite decimal/scientific notation input and restores `oldValue` for blank or invalid input.
- `lensPrescriptionGridDefaultColDef` — `{ sortable: false, suppressMovable: true }`.
- `LENS_PRESCRIPTION_GRID_DOM_LAYOUT` — `"autoHeight"`.
- `LENS_PRESCRIPTION_GRID_COLUMN_WIDTHS` — shared initial widths for prescription columns:
  - `surface`: `85`
  - `index`: `80`
  - `radiusOfCurvature`: `170`
  - `thickness`: `130`
  - `medium`: `115`
  - `semiDiameter`: `115`
  - `aspherical`: `140`
  - `decenter`: `135`
  - `diffractionGrating`: `165`
- `lensPrescriptionGridIndexColumnDef` — shared `Index` column config with `headerName: "Index"`, the shared `index` width, and `pinned: "left"`.
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

`LENS_PRESCRIPTION_GRID_COLUMN_WIDTHS` is the shared source for the `Surface`, `Index`, `Radius of Curvature`, `Thickness`, `Medium`, `Semi-diam.`, `Asph.`, `Tilt & Decenter`, and `Diffraction Grating` initial widths used by Lens Editor and Optimization. `lensPrescriptionGridIndexColumnDef` applies the `index` width and pins the `Index` column to the left; feature grids spread it into their local read-only `Index` column before adding their feature-specific value getter. `createSurfaceColumn` applies `surface`, `createRadiusOfCurvatureColumn` applies `radiusOfCurvature`, `createThicknessColumn` applies `thickness`, `createMediumColumn` applies `medium`, `createSemiDiameterColumn` applies `semiDiameter`, `createAsphericalColumn` applies `aspherical`, `createDecenterColumn` applies `decenter`, and `createDiffractionGratingColumn` applies `diffractionGrating`.

`createLensPrescriptionCommonColumns` returns the common column order used by the Lens Editor. Optimization uses the individual builders so its local `Var.` columns can stay interleaved after Radius, Thickness, and Asph.

The modal-backed `Asph.`, `Tilt & Decenter`, and `Diffraction Grating` builders apply shared initial widths and pass the row's actual optional config into the shared text action cells. Those cells display `None`, asphere type labels, decenter strategy values, or diffraction grating `lp/mm` labels while keeping the existing modal callbacks.
