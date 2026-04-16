# `features/optimization/components/ThicknessModeModal.tsx`

Renders the thickness variable/pickup modal with modal-local draft state.

## Behavior

- Seeds its local draft from the currently selected thickness mode when the modal opens.
- Lets users switch between `constant`, `variable`, and `pickup` modes and edit the relevant fields without mutating the parent optimization state while the modal remains open.
- Commits the latest draft through `onSetMode(surfaceIndex, draft)` only when the user presses `Done`.
- Backdrop dismissal only closes the modal and discards any uncommitted draft changes.
