# `features/optimization/components/RadiusModeModal.tsx`

Renders the radius variable/pickup modal with modal-local draft state.

## Behavior

- Seeds its local draft from the currently selected radius mode when the modal opens.
- Lets users switch between `constant`, `variable`, and `pickup` modes and edit the relevant fields without mutating the parent optimization state while the modal remains open.
- In `variable` mode, shows helper copy explaining that `R = 0` is a flat surface with infinite radius and that bounds must remain entirely negative or entirely positive.
- In `variable` mode, disables `Done` and shows an inline validation message when the entered min/max bounds straddle `0`.
- Commits the latest draft through `onSetMode(surfaceIndex, draft)` only when the user presses `Done`.
- Backdrop dismissal only closes the modal and discards any uncommitted draft changes.
