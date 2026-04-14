# `features/optimization/OptimizationPage.tsx`

## Purpose

Client page component for the optimization workflow. It initializes and continuously synchronizes a page-local optimization snapshot from the editor stores, renders the five-tab UI, calls the Pyodide worker, and applies optimized results back to the editor on confirmation.

## Props

```ts
interface OptimizationPageProps {
  proxy: PyodideWorkerAPI | undefined;
  isReady: boolean;
  onError: () => void;
  onApplyToEditor?: (model: OpticalModel) => Promise<void> | void;
}
```

## Behavior

- On first mount, seeds the optimization slice from the current editor draft.
- After mount, listens to live Lens Editor and Specs store changes and calls `syncFromOpticalModel(...)` so optimization reflects the latest prescription/spec state instead of staying stale.
- Renders two primary actions above the tabs:
  - `Optimize`
  - `Apply to Editor`
- Uses controlled `Tabs` with five sections:
  - `Algorithm`
  - `Fields`
  - `Wavelengths`
  - `Lens Prescription`
  - `Operands`
- Field and wavelength tabs render AG Grid tables where only the `Weight` column is editable.
- Lens Prescription tab renders a read-only prescription view with:
  - a `Var.` column after `Radius of Curvature` for radius variable/pickup configuration
  - a second `Var.` column after `Thickness` for thickness variable/pickup configuration
  - read-only `Medium`, `Semi-diam.`, `Asph.`, `Tilt & Decenter`, and `Diffraction Grating` columns
- Operands tab renders an add/delete AG Grid table with `Operand Kind` and `Target`.
- `Optimize` validates the store state, calls `proxy.optimizeOpm`, shows `LoadingOverlay` while running, opens a warning modal on failure, and applies successful radius results back into the page-local model.
- `Apply to Editor` opens a confirm modal, overwrites the lens-editor rows/specs/auto-aperture state with the page-local optimization snapshot, updates `committedOpticalModel`, and then calls optional `onApplyToEditor(model)`.
- Modal-backed prescription columns open the existing lens-editor dialogs in `readOnly` mode so users can inspect, but not edit, those settings from optimization.

## Key Conventions

- The optimization page stays decoupled from the editor while open; it does not mutate the editor until the user confirms `Apply to Editor`.
- Editor-driven optical-model changes propagate into optimization automatically; optimization-only UI state is preserved where the model shape remains compatible.
- The current UI exposes radius-only variables and pickups.
