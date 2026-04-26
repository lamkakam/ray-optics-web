# `features/optimization/components/OptimizationLensPrescriptionGrid.tsx`

Renders the optimization lens prescription grid, including a read-only surface `Index` column, radius/thickness variable buttons, asphere variable/pickup button, and read-only inspection cells that open existing lens-editor dialogs.

- Uses a horizontal-overflow wrapper for the wide prescription table and relies on parent layout padding instead of adding its own outer `p-4`.
- Leaves vertical overflow to the parent drawer/page layout by keeping the AG Grid in `domLayout="autoHeight"` and not introducing an inner vertical scroller.
- Applies `defaultColDef={{ sortable: false, suppressMovable: true }}` so the prescription columns stay in their prescribed order across the Optimization tabs.
- Uses optimization-local tooltip copy for the read-only `Medium`, `Asph.`, and `Diffraction Grating` inspection cells so they say `Click to view ...` without changing the editor page grid.
- Prepends an `Index` column before `Surface`; it is blank for `Object` and `Image`, and shows `1..N` for real surface rows using the existing optimization surface numbering.
- The radius and thickness `Var.` cells use the same `ActionWrapper` plus Tooltip-wrapped native `<button>` pattern as `Medium`; clicking either the button or the surrounding cell body opens the corresponding optimization modal for the surface. Their Tooltip trigger fills the cell action wrapper so hovering anywhere in the cell action area displays the tooltip. The buttons show the saved optimization mode as blank for `constant`, `V` for `variable`, and `P` for `pickup`.
- Adds a `Var.` column after `Asph.` for configuring asphere variable/pickup optimization targets; shown only for real surface rows. The button summarizes all saved asphere term modes as blank when every term is `constant`, `V` when any term is variable-only, `P` when any term is pickup-only, and `V,P` when variable and pickup terms are both present. Requires `asphereStates` and `onOpenAsphereVarModal` props.
- Sets the three optimization `Var.` columns to a narrow `60px` initial width sized for the `Var.` header text, while leaving them otherwise resizable by AG Grid defaults.
- Keeps `SetButton` rendering for non-optimization-mode inspection cells such as `Asph.`, `Tilt & Decenter`, and `Diffraction Grating`.
