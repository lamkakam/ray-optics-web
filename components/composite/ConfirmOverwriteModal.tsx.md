# `components/composite/ConfirmOverwriteModal.tsx`

## Purpose

Simple confirmation modal that warns the user that loading an example system will overwrite their current configuration.

## Props

```ts
interface ConfirmOverwriteModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}
```

## Prop Details

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isOpen` | `boolean` | Yes | Controls visibility |
| `onConfirm` | `() => void` | Yes | Proceeds with loading the example system |
| `onCancel` | `() => void` | Yes | Aborts the operation |

## Key Behaviors

- Stateless — purely presentational. Structurally identical to `ConfirmImportModal` but with different copy.

## Usages

- Shown when the user selects an example system from the example picker, before applying the DEMO model.
