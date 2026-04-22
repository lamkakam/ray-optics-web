# `features/optimization/components/RadiusModeModal.tsx`

Renders the radius variable/pickup modal with modal-local draft state.

## Behavior

- Seeds its local draft from the currently selected radius mode when the modal editor mounts, and resets that draft by remounting a keyed inner editor whenever the committed target surface or mode changes.
- Reuses shared helper functions from `features/optimization/lib/modalHelpers.ts` for draft seeding, mode options, keyed remount serialization, default mode transitions, curvature-radius guidance/error copy, and zero-crossing validation.
- Delegates the shared mode selector plus variable/pickup form sections to `ModeSelectField.tsx`, `BoundedVariableModeFields.tsx`, and `PickupModeFields.tsx`, while keeping radius-specific draft transitions, copy, and validation in this modal.
- Lets users switch between `constant`, `variable`, and `pickup` modes and edit the relevant fields without mutating the parent optimization state while the modal remains open.
- In `variable` mode, shows helper copy explaining that `R = 0` is a flat surface with infinite radius and that bounds must remain entirely negative or entirely positive.
- Renders a footer with `Cancel` and `Confirm`, with `Cancel` on the left and `Confirm` on the right.
- In `variable` mode, disables `Confirm` and shows an inline validation message when the entered min/max bounds straddle `0`.
- `Cancel` closes the modal and discards any uncommitted draft changes.
- Commits the latest draft through `onSetMode(surfaceIndex, draft)` only when the user presses `Confirm`.
- Clicking or touching outside the modal does not close it.
- Pressing `Escape` does not close it.
