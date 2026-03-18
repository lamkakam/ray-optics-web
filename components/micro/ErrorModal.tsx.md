# `components/micro/ErrorModal.tsx`

## Purpose

Pre-built error dialog that wraps `Modal` with a fixed "Error" title and a single "OK" dismiss button. Shows a customizable error message or a default validation message.

## Props

```ts
interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}
```

## Prop Details

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isOpen` | `boolean` | Yes | Controls visibility |
| `onClose` | `() => void` | Yes | Called when the OK button is clicked |
| `message` | `string` | No | Custom error text. Defaults to a generic validation message |

## Key Behaviors

- No backdrop-click dismissal (omits `onBackdropClick`), requiring explicit OK press.

## Usages

- Used in `LensPrescriptionContainer` to report JSON import validation failures.
