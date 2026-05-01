# `features/example-systems/lib/applyExampleSystem.ts`

Reusable application flow for bundled example optical systems.

## Behavior

- Loads `model.specs` into `SpecsConfiguratorState`.
- Converts the optical model surfaces to lens prescription rows with `surfacesToGridRows()`.
- Mirrors `model.setAutoAperture` into the Lens Editor auto-aperture flag.
- Computes first-order data, lens layout image, selected analysis plot data, and Seidel data.
- Commits first-order data, layout image, plot data, Seidel data, specs, and optical model to their stores.
- Commits selected plot-store-backed analysis results through `commitAnalysisPlotResult(...)`, including diffraction MTF data.
- Leaves surface-by-surface Seidel plot results out of `AnalysisPlotState`; the full Seidel payload is committed to `AnalysisDataState` separately.
- Clears layout and plot loading flags in `finally`.
