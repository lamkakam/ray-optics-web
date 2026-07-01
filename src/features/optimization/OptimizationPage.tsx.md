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

- On page mount, initializes the optimization slice from the current editor draft only when the optimization slice does not already have a model; persisted Optimization state survives route returns.
- Listens to live Lens Editor and Specs store changes and calls `syncFromOpticalModel(...)` so optimization reflects the latest prescription/spec state instead of staying stale.
- Passes the Lens Editor `optimizationSyncPolicy` into `syncFromOpticalModel(...)` so normal editor prescription edits reset Optimization prescription modes, while Optimization Apply and Focusing-origin edits preserve those modes.
- Renders the extracted `OptimizationActionBar` above the tabs with:
  - `Optimize`
  - `Apply to Editor`
- Derives the action button size from `useScreenBreakpoint()` and passes it to `OptimizationActionBar`: `xs` on `screenSM`, `sm` otherwise. This matches Lens Editor's `Update System` responsive sizing.
- Renders the extracted `OptimizationEvaluationPanel` between the action row and the tabs. The table is driven by `evaluateOptimizationProblem(...)`, shows one row per returned residual whose effective `total_weight` is non-zero with `Operand Type`, `Target`, `Weight`, and `Value`, formats `Weight` and `Value` with 6 decimal places, can show a warning banner above the table or empty state, and switches between a live height-capped scroll body on large screens and a full-height body on small screens.
- When the current store state cannot build an optimization config, passes the thrown `buildOptimizationConfig()` error message into the evaluation panel so Operand Evaluation shows the specific invalid-config reason before either the table or the existing placeholder text.
- Delegates controlled `BottomDrawer` tab construction and rendering to `BottomDrawerContainer`, with five sections:
  - `Algorithm`
  - `Half-Fields`
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
  - `OptimizationWeightsGrid` for `Half-Fields` and `Wavelengths`
  - `OptimizationLensPrescriptionGrid`
  - `OptimizationOperandsTab`
- The field and wavelength grid components render AG Grid tables where only the `Weight` column is editable.
- `OptimizationLensPrescriptionGrid` renders a read-only prescription view with:
  - an `Index` column before `Surface` that is blank for `Object` and `Image` and shows `1..N` for real surface rows
  - a `Var.` column after `Radius of Curvature` for radius variable/pickup configuration
  - a second `Var.` column after `Thickness` for thickness variable/pickup configuration
  - read-only `Medium`, `Semi-diam.`, `Asph.` columns
  - read-only `Aperture` column after `Semi-diam.` that opens the aperture inspection modal
  - a third `Var.` column after `Asph.` for asphere variable/pickup configuration (real surface rows only; opens `AsphereVarModal`)
  - read-only `Tilt & Decenter` and `Diffraction Grating` columns
- `OptimizationOperandsTab` renders an add/delete AG Grid table with `Operand Kind`, `Target`, and `Weight`, including combined and axis-specific OPD Difference and Ray Fan operand options.
- The `Weight` column is editable, defaults to `"1"` for new rows, and is validated as a positive non-zero number when optimization config is built.
- Whenever the committed optimization config changes, the component debounces a worker-side evaluation call, passes the app-wide `imagePoint`, updates the static table from the returned residuals, and ignores stale async responses from older requests.
- Radius, thickness, and asphere variable/pickup mode dialogs keep edits in modal-local draft state, so changing mode or typing values does not refresh the live evaluation table until the user presses `Done`. Changes to `asphereStates` are included in the evaluation dependency array so commits trigger a re-evaluation debounce.
- The page derives one shared `canUseBounds` boolean from the selected least-squares method and passes that boolean to the radius, thickness, and asphere modals so their `variable` mode rendering stays decoupled from optimizer-kind/method details.
- When the user explicitly switches the Method select and the updated config fails `buildOptimizationConfig()`, `BottomDrawerContainer` reports the thrown error message through the page-local warning callback instead of filtering to one hardcoded `lm` warning.
- When the user switches Optimizer Kind, `BottomDrawerContainer` delegates to the store's `setOptimizerKind()` action so algorithm fields reset to the selected optimizer's defaults.
- Variable-bound affordances use optimizer-kind-aware capabilities, so both bounded least-squares (`trf`) and methodless Differential Evolution can use the min/max variable UI while `lm` remains unbounded.
- Invalid intermediate configs clear the evaluation table and show the current `buildOptimizationConfig()` error in Operand Evaluation.
- Operand Evaluation loading and completion state updates must not re-render the bottom drawer grid subtree or reset active AG Grid editors; the page passes memoized drawer `layout`, `fields`, `wavelengths`, and `prescription` prop objects, with `onHeightChange` present only for large-screen drawer mode.
- `Optimize` is disabled when the current optimization config cannot be built, including fresh pages with no operands and malformed variable/pickup inputs.
- `Optimize` is also disabled when the current built merit function has no non-zero effective contribution after combining operand, field, and wavelength weights.
- `Optimize` is disabled while any Optimization AG Grid cell edit is active, while a post-edit Operand Evaluation refresh is pending, and while Operand Evaluation is currently evaluating.
- Page-level AG Grid edit lifecycle tracking increments on `onCellEditingStarted`, decrements on `onCellEditingStopped`, increments an edit-stop revision so even no-op edits schedule a refresh, and marks the committed post-edit state as pending until the next debounced Operand Evaluation request settles; invalid config or missing worker prerequisites clear that pending gate without running an evaluation.
- `Optimize` does not blur active AG Grid editors to force a commit. If the handler is triggered programmatically while editing, waiting for post-edit evaluation, evaluating, invalid, or zero-contribution, it returns without calling `optimizeOpm`.
- `Optimize` validates the store state, rejects zero-contribution configs with an Operand Evaluation warning even if the handler is triggered programmatically, opens `OptimizationProgressModal`, creates a per-run id, creates a `SharedArrayBuffer` interrupt buffer when worker/browser support is available, calls `proxy.optimizeOpm` with the app-wide `imagePoint`, streams merit-history updates into the modal chart through a Comlink progress callback, always applies the returned optimization report back into the page-local model, and still shows an Operand Evaluation warning when the returned status is unsuccessful.
- The page checks `proxy.canInterruptOptimization()` and disables the progress modal Stop control when Pyodide interrupt support or `SharedArrayBuffer` is unavailable.
- Clicking Stop is idempotent for the active run: it writes Pyodide's interrupt signal into the shared interrupt buffer immediately, calls `proxy.requestOptimizationStop(activeRunId)` for worker-side run validation, disables the Stop button while the run is settling, and leaves the progress modal open.
- A stopped report with `status: "stopped"` is treated as a successful partial optimization result: the page applies its `final_values`, preserves the final chart history, switches the modal to completed `OK` controls in the normal `finally` path, and does not show a warning for that user-requested status.
- Late or stale stop responses are ignored by the page orchestration because only the active run's worker promise can update the completed optimization state.
- The progress modal is blocking while optimization is active: there is no `OK` button and backdrop clicks are ignored until the worker promise settles.
- After the optimization run settles, the progress modal keeps the final chart visible, exposes an `OK` button, and can then be dismissed without mutating the optimization result.
- `Apply to Editor` opens a confirm modal, applies the page-local optimization snapshot through `applyOptimizationModelToEditor()`, clears the store's unapplied-result marker, and then calls optional `onApplyToEditor(model)`.
- Modal rendering is delegated to extracted wrappers:
  - `RadiusModeModal`
  - `ThicknessModeModal`
  - `AsphereVarModal`
  - `OptimizationProgressModal`
  - `OptimizationApplyConfirmModal`
  - `OptimizationInspectionModals`
- Modal-backed prescription columns still open the existing lens-editor dialogs in `readOnly` mode so users can inspect, but not edit, those settings from optimization, including aperture settings.

## Key Conventions

- The optimization page stays decoupled from the editor while open; it does not mutate the editor until the user confirms `Apply to Editor`.
- Mount-time initialization preserves existing optimization weights, operands, algorithm settings, and variable/pickup modes when returning to the route without editor changes.
- Editor-driven optical-model changes propagate into optimization automatically; field, wavelength, and prescription differences are synchronized independently so only affected optimization defaults reset.
- The live evaluation table uses the residual `total_weight` reported by Python and hides rows whose effective weight is zero, so field/wavelength-expanded operands appear only for active contributions.
- Large-screen evaluation height is derived from the observed page-shell height, the current live drawer height, and measured fixed overhead above the table, with a fallback reserve when DOM measurement is not yet available.
- The page treats zero-weight blocking generically based on optional `fields` and `wavelengths` arrays in the built optimization config instead of hardcoding operand kinds, so newly added operands inherit the rule automatically if they follow the same config shape.
- `OptimizationPage` remains responsible for deriving row data, evaluation state, warning text, modal state, worker calls, and the page-level Apply to Editor confirmation. The editor mutation itself is factored into `features/optimization/lib/applyOptimizationModelToEditor.ts` so the app shell navigation warning can reuse the same apply path.
- `BottomDrawerContainer` owns the drawer wrapper, tab assembly, active-tab state binding, optimizer handlers, field/wavelength weight handlers, prescription variable-modal handlers, operand handlers, and AG Grid edit lifecycle callback forwarding by reading the optimization store directly and receiving page-level lifecycle callbacks.
- Page-level optimization components are imported through their component-directory `index.ts` barrels. `BottomDrawerContainer` handles the narrow drawer-tab component imports, while `OptimizationInspectionModals` comes from its own nested directory barrel.
- Optimization worker report/progress types are imported from `features/optimization/types/optimizationWorkerTypes.ts`.
- Changing the Method select updates the optimization store immediately, so evaluation config building and variable modal rendering switch between bounded `trf` and unbounded `lm` behavior in place.
- That method-switch warning is limited to explicit method changes, but it surfaces any config-build error produced by the switch inside Operand Evaluation instead of only one hardcoded residual-count message.
- AG Grid tabs keep `domLayout="autoHeight"` and avoid their own vertical scroll wrappers so the drawer panel is the single vertical scroller on large screens.
- The tabbed AG Grid tables also disable column reordering via `defaultColDef.suppressMovable` so users cannot swap column order between sessions or tabs.
