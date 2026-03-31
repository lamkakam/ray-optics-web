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

```tsx
// Basic error modal with default message
const [errorOpen, setErrorOpen] = useState(false);

<ErrorModal
  isOpen={errorOpen}
  onClose={() => setErrorOpen(false)}
/>

// Error modal with custom message
<ErrorModal
  isOpen={errorOpen}
  onClose={() => setErrorOpen(false)}
  message="Failed to import lens file: Invalid JSON format"
/>

// Usage in page-level component
const errorModal = (
  <ErrorModal
    isOpen={errorModalOpen}
    onClose={() => setErrorModalOpen(false)}
  />
);

<Layout errorModal={errorModal}>
  {/* Page content */}
</Layout>

// Triggered by validation error
try {
  const parsed = JSON.parse(importedData);
  // ... validation ...
} catch (error) {
  setErrorMessage(error.message);
  setErrorOpen(true);
}
```
