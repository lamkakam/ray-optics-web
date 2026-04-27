# `features/lens-editor/components/LensPrescriptionContainer/ConfirmImportModal/ConfirmImportModal.tsx`

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

```tsx
import { ConfirmImportModal } from "@/features/lens-editor/components/LensPrescriptionContainer/ConfirmImportModal";

// In a container component
const [pendingImportData, setPendingImportData] = useState<OpticalModel | undefined>();

const handleConfirmImport = () => {
  if (pendingImportData) onImportJson(pendingImportData);
  setPendingImportData(undefined);
};

const handleCancelImport = () => setPendingImportData(undefined);

return (
  <>
    <ConfirmImportModal
      isOpen={pendingImportData !== undefined}
      onConfirm={handleConfirmImport}
      onCancel={handleCancelImport}
    />
  </>
);
```
