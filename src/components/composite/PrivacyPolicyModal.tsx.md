# `components/composite/PrivacyPolicyModal.tsx`

## Purpose

Modal that displays the app's privacy policy explaining the client-side architecture, third-party CDN requests (jsDelivr, Python Hosted, PyPI), and IP address logging by those CDNs.

## Props

```ts
interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}
```

## Prop Details

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isOpen` | `boolean` | Yes | Controls visibility |
| `onClose` | `() => void` | Yes | Called when the Close button is clicked |

## Key Behaviors

- Stateless — purely presentational.
- Content is scrollable (`max-h-96 overflow-y-auto`) to fit the policy text within the modal.

## Usages

- Opened from the settings area via a privacy policy button (with a lock emoji).
