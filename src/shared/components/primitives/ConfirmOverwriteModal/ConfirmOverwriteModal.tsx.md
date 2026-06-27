# `shared/components/primitives/ConfirmOverwriteModal/ConfirmOverwriteModal.tsx`

Confirmation modal used before loading an example optical system.

| Prop | Type | Required | Description |
|---|---|---:|---|
| `isOpen` | `boolean` | Yes | Controls modal visibility |
| `onConfirm` | `() => void` | Yes | Confirms overwrite and continues loading |
| `onCancel` | `() => void` | Yes | Cancels loading |
## Modal Footer

- Cancel and Load actions are passed to `Modal.footer` so they remain fixed outside the message body.
