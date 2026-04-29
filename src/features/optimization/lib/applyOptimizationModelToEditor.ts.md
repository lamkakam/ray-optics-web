# `features/optimization/lib/applyOptimizationModelToEditor.ts`

## Purpose

Shared helper that applies an optimization-local optical model snapshot back to the lens editor stores.

## Export

- `applyOptimizationModelToEditor({ model, lensStore, specsStore })` — writes specs, prescription rows, auto-aperture state, and committed optical-model state into the editor.

## Behavior

- Loads and commits `model.specs` through `SpecsConfiguratorState`.
- Converts `model` surfaces to prescription grid rows with `surfacesToGridRows()`.
- Calls `LensEditorState.setRows()` with `optimizationSyncPolicy: "preserveOptimizationModes"` so the Optimization store can sync the applied model without discarding compatible optimization variable/pickup settings.
- Mirrors `model.setAutoAperture` into the editor auto-aperture flag.
- Commits the full optical model in the lens editor store.

## Consumers

- `features/optimization/OptimizationPage.tsx`
- `app/AppShell.tsx`
