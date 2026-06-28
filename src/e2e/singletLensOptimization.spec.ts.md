# `singletLensOptimization.spec.ts`

## Purpose

Playwright end-to-end coverage for the complete singlet optimization workflow, from importing the supplied lens configuration through applying optimized even-aspheric coefficients back to the Lens Editor.

## Flow

1. Load `jsons/singlet-lens-optimization-test.json` through the Lens Editor and confirm the import.
2. Open Optimization and select the least-squares Levenberg–Marquardt method.
3. Configure displayed surface index `2` as Even Aspheric, with `a_4`, `a_6`, `a_8`, and `a_10` variable.
4. Add a Ray Fan operand with weight `100`.
5. Run optimization, wait for completion, and dismiss the progress dialog.
6. Attempt to leave Optimization through the app navigation, stay on the first unapplied-result prompt, then leave again and apply the optimized model through the confirmation dialog.
7. Return to the Lens Editor and inspect displayed surface index `2`.

## Assertions

- Optimization completes and exposes the progress dialog's `OK` action.
- The applied surface reports `Even Aspherical` in the prescription grid.
- The `a_4`, `a_6`, `a_8`, and `a_10` fields contain finite numeric values.
- At least one of those optimized coefficients is non-zero.

The test identifies the target prescription row by its displayed `Index` value rather than its positional AG Grid row index. Because changing an operand kind can recreate the operand-grid columns, the weight edit targets the stable Weight cell position in the single operand row rather than retaining a transient AG Grid column ID.
