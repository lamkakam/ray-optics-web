# `features/optimization/components/OptimizationLensPrescriptionGrid.tsx`

Renders the optimization lens prescription grid, including a read-only surface `Index` column, radius/thickness variable buttons, asphere variable/pickup button, and read-only inspection cells that open existing lens-editor dialogs.

- Uses a horizontal-overflow wrapper for the wide prescription table and relies on parent layout padding instead of adding its own outer `p-4`.
- Leaves vertical overflow to the parent drawer/page layout by keeping the AG Grid in `domLayout="autoHeight"` and not introducing an inner vertical scroller.
- Uses optimization-local tooltip copy for the read-only `Medium`, `Asph.`, and `Diffraction Grating` inspection cells so they say `Click to view ...` without changing the editor page grid.
- Prepends an `Index` column before `Surface`; it is blank for `Object` and `Image`, and shows `1..N` for real surface rows using the existing optimization surface numbering.
- Adds a `Var.` column after `Asph.` for configuring asphere variable/pickup optimization targets; shown only for real surface rows. The button shows "Set" when no terms are variable/pickup, and "Edit" when at least one term is. Requires `asphereStates` and `onOpenAsphereVarModal` props.
