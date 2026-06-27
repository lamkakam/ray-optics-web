# `features/lens-editor/components/LensPrescriptionContainer/AddReferenceSurfaceModal/AddReferenceSurfaceModal.tsx`

Confirmation modal shown after a successful Reverse formatting operation when the resulting first physical surface has nonzero tilt or decenter.

## Props

```ts
interface AddReferenceSurfaceModalProps {
  readonly isOpen: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}
```

## Behavior

- Uses the shared `Modal` primitive with title `Add Reference Surface?`.
- Explains that rayoptics wavefront and OPD calculations can be unreliable when the first physical surface is tilted or decentered, and that a flat air reference surface after Object avoids the topology issue.
- `No` calls `onCancel` so the caller can apply the reversed rows unchanged.
- `Yes` calls `onConfirm` so the caller can insert a flat air reference surface before applying rows.
## Modal Footer

- No and Yes actions are passed to `Modal.footer` so they remain fixed outside the explanatory body.
