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
- Renders a static `Operand Evaluation` table between the action row and the tabs using the shared `Table` primitive. The table is driven by `evaluateOptimizationProblem(...)`, shows one row per returned residual with `Operand Type`, `Target`, `Weight`, and `Value`, and sits inside a vertically scrollable container when the content grows tall.
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
- Operands tab renders an add/delete AG Grid table with `Operand Kind`, `Target`, and `Weight`, including an `OPD Difference` operand option whose default target is `0`.
- The `Weight` column is editable, defaults to `"1"` for new rows, and is validated as a positive non-zero number when optimization config is built.
- Whenever the optimization config changes, the component debounces a worker-side evaluation call, updates the static table from the returned residuals, and ignores stale async responses from older requests.
- Invalid intermediate configs clear the evaluation table instead of opening the warning modal.
- `Optimize` validates the store state, calls `proxy.optimizeOpm`, shows `LoadingOverlay` while running, always applies the returned optimization report back into the page-local model, and still opens a warning modal when the returned status is unsuccessful.
- `Apply to Editor` opens a confirm modal, overwrites the lens-editor rows/specs/auto-aperture state with the page-local optimization snapshot, updates `committedOpticalModel`, and then calls optional `onApplyToEditor(model)`.
- Modal-backed prescription columns open the existing lens-editor dialogs in `readOnly` mode so users can inspect, but not edit, those settings from optimization.

## Key Conventions

- The optimization page stays decoupled from the editor while open; it does not mutate the editor until the user confirms `Apply to Editor`.
- Editor-driven optical-model changes propagate into optimization automatically; optimization-only UI state is preserved where the model shape remains compatible.
- The live evaluation table uses the residual `total_weight` reported by Python, so field/wavelength-expanded operands can appear as multiple rows with their effective weights.
