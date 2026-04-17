# `features/optimization/OptimizationPage.tsx`

## Purpose

Client page component for the optimization workflow. It initializes and continuously synchronizes a page-local optimization snapshot from the editor stores, orchestrates the extracted optimization view components, calls the Pyodide worker, and applies optimized results back to the editor on confirmation.

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

- On each page mount, re-seeds the optimization slice from the current editor draft so initial optimization defaults always match the current editor state even though the underlying store provider persists across route switches.
- After mount, listens to live Lens Editor and Specs store changes and calls `syncFromOpticalModel(...)` so optimization reflects the latest prescription/spec state instead of staying stale.
- Renders the extracted `OptimizationActionBar` above the tabs with:
  - `Optimize`
  - `Apply to Editor`
- Renders the extracted `OptimizationEvaluationPanel` between the action row and the tabs. The table is driven by `evaluateOptimizationProblem(...)`, shows one row per returned residual whose effective `total_weight` is non-zero with `Operand Type`, `Target`, `Weight`, and `Value`, formats `Weight` and `Value` with 6 decimal places, and switches between a live height-capped scroll body on large screens and a full-height body on small screens.
- Uses controlled `BottomDrawer` tabs with five sections:
  - `Algorithm`
  - `Fields`
  - `Wavelengths`
  - `Lens Prescription`
  - `Operands`
- Matches the Lens Editor drawer pattern responsively:
  - on `screenLG`, renders a draggable `BottomDrawer` anchored to the bottom of the page with `mt-auto` and keeps the page shell `overflow-hidden` so the drawer panel owns tab-content scrolling
  - on `screenLG`, observes the page shell height and listens to `BottomDrawer.onHeightChange(...)` so the operand evaluation table grows when the drawer is dragged downward and shrinks when the drawer is dragged upward
  - on smaller screens, renders the same `BottomDrawer` in non-draggable mode while the page continues to scroll vertically
  - on smaller screens, disables the evaluation panel's internal vertical scrollbar so the page owns the only vertical scroll position
  - the page shell itself does not own outer padding; instead, a descendant wrapper pads the shared action/evaluation/modal section and a separate drawer wrapper keeps only the drawer bottom spacing so the drawer still spans edge to edge
  - the optimization page passes `panelClassName="p-0"` to `BottomDrawer` so each tab keeps a single `p-4` content gutter that matches the rest of the page layout instead of stacking drawer padding with per-tab padding
- The tabs delegate their view rendering to feature components:
  - `OptimizationAlgorithmTab`
  - `OptimizationWeightsGrid` for `Fields` and `Wavelengths`
  - `OptimizationLensPrescriptionGrid`
  - `OptimizationOperandsTab`
- The field and wavelength grid components render AG Grid tables where only the `Weight` column is editable.
- `OptimizationLensPrescriptionGrid` renders a read-only prescription view with:
  - an `Index` column before `Surface` that is blank for `Object` and `Image` and shows `1..N` for real surface rows
  - a `Var.` column after `Radius of Curvature` for radius variable/pickup configuration
  - a second `Var.` column after `Thickness` for thickness variable/pickup configuration
  - read-only `Medium`, `Semi-diam.`, `Asph.` columns
  - a third `Var.` column after `Asph.` for asphere variable/pickup configuration (real surface rows only; opens `AsphereVarModal`)
  - read-only `Tilt & Decenter` and `Diffraction Grating` columns
- `OptimizationOperandsTab` renders an add/delete AG Grid table with `Operand Kind`, `Target`, and `Weight`, including an `OPD Difference` operand option whose default target is `0`.
- The `Weight` column is editable, defaults to `"1"` for new rows, and is validated as a positive non-zero number when optimization config is built.
- Whenever the committed optimization config changes, the component debounces a worker-side evaluation call, updates the static table from the returned residuals, and ignores stale async responses from older requests.
- Radius, thickness, and asphere variable/pickup mode dialogs keep edits in modal-local draft state, so changing mode or typing values does not refresh the live evaluation table until the user presses `Done`. Changes to `asphereStates` are included in the evaluation dependency array so commits trigger a re-evaluation debounce.
- Invalid intermediate configs clear the evaluation table instead of opening the warning modal.
- `Optimize` is disabled when the current built merit function has no non-zero effective contribution after combining operand, field, and wavelength weights.
- `Optimize` validates the store state, rejects zero-contribution configs with a warning modal even if the handler is triggered programmatically, opens `OptimizationProgressModal`, calls `proxy.optimizeOpm`, streams merit-history updates into the modal chart through a Comlink progress callback, always applies the returned optimization report back into the page-local model, and still opens a warning modal when the returned status is unsuccessful.
- The progress modal is blocking while optimization is active: there is no `OK` button and backdrop clicks are ignored until the worker promise settles.
- After the optimization run settles, the progress modal keeps the final chart visible, exposes an `OK` button, and can then be dismissed without mutating the optimization result.
- `Apply to Editor` opens a confirm modal, overwrites the lens-editor rows/specs/auto-aperture state with the page-local optimization snapshot, updates `committedOpticalModel`, and then calls optional `onApplyToEditor(model)`.
- Modal rendering is delegated to extracted wrappers:
  - `RadiusModeModal`
  - `ThicknessModeModal`
  - `AsphereVarModal`
  - `OptimizationProgressModal`
  - `OptimizationWarningModal`
  - `OptimizationApplyConfirmModal`
  - `OptimizationInspectionModals`
- Modal-backed prescription columns still open the existing lens-editor dialogs in `readOnly` mode so users can inspect, but not edit, those settings from optimization.

## Key Conventions

- The optimization page stays decoupled from the editor while open; it does not mutate the editor until the user confirms `Apply to Editor`.
- Mount-time initialization intentionally overwrites any stale persisted optimization weights/operands from a previous visit so the page always starts from the current editor model.
- Editor-driven optical-model changes propagate into optimization automatically; optimization-only UI state is preserved where the model shape remains compatible.
- The live evaluation table uses the residual `total_weight` reported by Python and hides rows whose effective weight is zero, so field/wavelength-expanded operands appear only for active contributions.
- Large-screen evaluation height is derived from the observed page-shell height, the current live drawer height, and measured fixed overhead above the table, with a fallback reserve when DOM measurement is not yet available.
- The page treats zero-weight blocking generically based on optional `fields` and `wavelengths` arrays in the built optimization config instead of hardcoding operand kinds, so newly added operands inherit the rule automatically if they follow the same config shape.
- `OptimizationPage` remains the orchestration boundary: extracted components are view-focused and receive callbacks/state from the page instead of reading stores directly.
- AG Grid tabs keep `domLayout="autoHeight"` and avoid their own vertical scroll wrappers so the drawer panel is the single vertical scroller on large screens.
