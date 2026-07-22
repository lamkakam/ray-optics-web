/**
# `features/lens-editor/components/LensPrescriptionContainer/ConfirmImportModal/ConfirmImportModal.tsx`

## Modal Footer

- Cancel and Load actions are passed to `Modal.footer` so they remain fixed outside the message body.
*/
"use client";

import { Modal } from "@/shared/components/primitives/Modal";
import { Button } from "@/shared/components/primitives/Button";
import { Paragraph } from "@/shared/components/primitives/Paragraph";

/**
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
*/
interface ConfirmImportModalProps {
  readonly isOpen: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

/**
## Purpose

Simple confirmation modal that warns the user that loading a config JSON will overwrite their current System Specs and Lens Prescription.

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
*/
export function ConfirmImportModal({ isOpen, onConfirm, onCancel }: ConfirmImportModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      title="Load Config"
      footer={(
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onConfirm}>
            Load
          </Button>
        </div>
      )}
    >
      <Paragraph variant="body" className="mb-6">
        This will overwrite your current System Specs and Lens Prescription. Continue?
      </Paragraph>
    </Modal>
  );
}
