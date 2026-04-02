# `features/lens-editor/components/SpecsConfiguratorContainer.tsx`

## Purpose

Container that connects the `specsConfiguratorStore` to `SpecsConfiguratorPanel` and its two config modals (`FieldConfigModal`, `WavelengthConfigModal`). Derives human-readable summaries for field and wavelength.

## Injected Dependencies
Imperative access to specs actions is via `useSpecsConfiguratorStore()` (stable, non-reactive). For reactive states, use `useSpecsConfiguratorStore` with Zustand's `useStore`.

## Key Behaviors

- Subscribes to all relevant store slices individually with `useStore(store, selector)` for granular reactivity.
- Computes `fieldSummary` (e.g. `"3 fields, 20° max"`) and `wavelengthSummary` (e.g. `"3 wavelengths"`) inline.
- All store mutation callbacks (`handleApertureChange`, `handleFieldApply`, `handleWavelengthApply`) are wrapped in `useCallback` with `[store]` dependency and call `store.getState().<action>` to avoid stale closures.
- Modal open/close is driven by `fieldModalOpen` and `wavelengthModalOpen` state from the store.

## Usages

- Mounted once in the main page inside the `BottomDrawer` tabs, alongside `LensPrescriptionContainer`.
