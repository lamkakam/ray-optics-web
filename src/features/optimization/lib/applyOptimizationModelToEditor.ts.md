# `features/optimization/lib/applyOptimizationModelToEditor.ts`

## Purpose

Shared helper that applies an optimization-local optical model snapshot back to the lens editor stores.

## Export

- `applyOptimizationModelToEditor({ model, lensStore, specsStore, proxy })` fetches and validates fresh auto-aperture semi-diameters before atomically writing editor state. Manual models bypass extraction and clear the cache; fetch failures leave the editor unchanged.

## Behavior

- Loads and commits `model.specs` through `SpecsConfiguratorState`.
- Converts `model` surfaces to prescription grid rows with `surfacesToGridRows()`.
- Calls `LensEditorState.setRows()` with `optimizationSyncPolicy: "preserveOptimizationModes"` so the Optimization store can sync the applied model without discarding compatible optimization variable/pickup settings.
- Mirrors `model.setAutoAperture` into the editor auto-aperture flag.
- Commits the full optical model in the lens editor store.

## Consumers

- `features/optimization/OptimizationPage.tsx`
- `app/AppShell.tsx`
