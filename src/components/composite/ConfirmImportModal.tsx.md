# `components/composite/ConfirmImportModal.tsx`

## Purpose

Simple confirmation modal that warns the user that loading a config JSON will overwrite their current System Specs and Lens Prescription.

## Props

```ts
interface ConfirmImportModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}
```

## Prop Details

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isOpen` | `boolean` | Yes | Controls visibility |
| `onConfirm` | `() => void` | Yes | Proceeds with the import |
| `onCancel` | `() => void` | Yes | Aborts the import |

## Key Behaviors

- Stateless — purely presentational.

## Usages

- Shown after a valid JSON file is parsed but before applying it.
