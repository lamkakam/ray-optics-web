# `features/import-custom-glass/components/CustomGlassModal/CustomGlassModal.tsx`

## Purpose
Add/edit modal for a single user-defined tabulated custom glass.

## Props
- `mode` selects `Add Glass` or `Edit Glass` title and duplicate-label behavior.
- `existingLabels` is used to reject duplicate labels.
- `initialLabel` and `initialRows` seed the modal state.
- `onCancel` closes without saving.
- `onSubmit(label, rows)` receives the trimmed label and current editable rows after validation passes.

## Behavior
- Uses the shared `Modal` primitive and an AG Grid instance for row editing.
- Preserves the tabulated pair columns: delete action, `Fraunhofer`, `Wavelength (nm)`, and `Refractive Index`.
- The Fraunhofer selector fills the matching wavelength and clears free-form wavelength edits when wavelength is manually changed.
- Confirm is disabled until the label is non-blank and unique, there are at least four rows, all wavelength/index values are finite positive numbers, and wavelengths are distinct.
- The modal-level `Add row`, `Cancel`, and `Confirm` buttons use the Lens Editor responsive sizing rule: shared `Button` size `sm` on `screenLG`, and `xs` on `screenSM`.
- Row-level AG Grid delete actions stay fixed at shared `Button` size `xs`.
- Duplicate wavelengths are marked with `text-red-600` and a validation message.
- Wraps the coefficient grid with `import-custom-glass-touch-scroll` and component-local coarse-pointer CSS that restores horizontal and vertical touch panning plus scroll chaining for AG Grid viewports in this modal only.
- Passes `suppressTouch={true}` to this feature-owned AG Grid instance.

## Accessibility
- The label input exposes `aria-label="Label"`.
- Row delete actions expose `aria-label="Delete row {id}"`.
- Footer actions keep the visible labels and aria labels `Cancel` and `Confirm`.
- `Add row` keeps the same visible label and aria label.
