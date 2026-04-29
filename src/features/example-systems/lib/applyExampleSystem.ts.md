# `features/example-systems/lib/applyExampleSystem.ts`

Reusable application flow for bundled example optical systems.

## Behavior

- Loads `model.specs` into `SpecsConfiguratorState`.
- Converts the optical model surfaces to lens prescription rows with `surfacesToGridRows()`.
- Mirrors `model.setAutoAperture` into the Lens Editor auto-aperture flag.
- Computes first-order data, lens layout image, selected analysis plot data, and Seidel data.
- Commits first-order data, layout image, plot data, Seidel data, specs, and optical model to their stores.
- Clears layout and plot loading flags in `finally`.
