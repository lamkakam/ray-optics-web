# `features/optimization/components/ThicknessModeModal.tsx`

Renders the thickness variable/pickup modal with modal-local draft state.

## Behavior

- Seeds its local draft from the currently selected thickness mode when the modal editor mounts, and resets that draft by remounting a keyed inner editor whenever the committed target surface or mode changes.
- Reuses shared helper functions from `features/optimization/lib/modalHelpers.ts` for draft seeding, mode options, keyed remount serialization, and default mode transitions.
- Delegates the shared mode selector plus variable/pickup form sections to `ModeSelectField.tsx`, `VariableModeFields.tsx`, and `PickupModeFields.tsx`, while keeping thickness-specific draft transitions and summary text in this modal.
- Lets users switch between `constant`, `variable`, and `pickup` modes and edit the relevant fields without mutating the parent optimization state while the modal remains open.
- Renders a footer with `Cancel` and `Confirm`, with `Cancel` on the left and `Confirm` on the right.
- `Cancel` closes the modal and discards any uncommitted draft changes.
- Commits the latest draft through `onSetMode(surfaceIndex, draft)` only when the user presses `Confirm`.
- Clicking or touching outside the modal does not close it.
- Pressing `Escape` does not close it.
