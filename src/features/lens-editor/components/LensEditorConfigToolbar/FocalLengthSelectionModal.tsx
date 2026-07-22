/**
# `features/lens-editor/components/LensEditorConfigToolbar/FocalLengthSelectionModal.tsx`

## Modal Footer

- Cancel and Confirm actions are passed to `Modal.footer` so they remain fixed while the focal-length choices scroll.
*/
"use client";

import { useState } from "react";
import { Button } from "@/shared/components/primitives/Button";
import { Modal } from "@/shared/components/primitives/Modal";
import { RadioInput, type RadioOption } from "@/shared/components/primitives/RadioInput";
import type { PhotonsToPhotosFocalLengthChoice } from "@/features/lens-editor/lib/photonsToPhotosParser";

/**
## Props

| Prop | Type | Description |
|------|------|-------------|
| `isOpen` | `boolean` | Controls visibility |
| `choices` | `PhotonsToPhotosFocalLengthChoice[]` | Available focal-length columns |
| `onConfirm` | `(choiceIndex: number) => void` | Resolves the selected column |
| `onCancel` | `() => void` | Aborts the TXT import |
*/
interface FocalLengthSelectionModalProps {
  readonly isOpen: boolean;
  readonly choices: readonly PhotonsToPhotosFocalLengthChoice[];
  readonly onConfirm: (choiceIndex: number) => void;
  readonly onCancel: () => void;
}

/**
## Purpose

Toolbar-local modal for choosing a focal-length column when importing a zoom Photons to Photos `.txt` file.

## Behavior

- Renders a non-backdrop-dismissible `Modal` titled `Select Focal Length`.
- Uses shared `RadioInput` with labels like `24.376 mm`; the first choice is selected initially.
- `Cancel` closes without importing. `Confirm` passes the selected choice index back to the toolbar.
*/
export function FocalLengthSelectionModal({
  isOpen,
  choices,
  onConfirm,
  onCancel,
}: FocalLengthSelectionModalProps) {
  const [selectedIndex, setSelectedIndex] = useState("0");
  const options: readonly RadioOption<string>[] = choices.map((choice) => ({
    value: String(choice.index),
    label: `${choice.focalLength} mm`,
  }));

  return (
    <Modal
      isOpen={isOpen}
      title="Select Focal Length"
      footer={(
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel} aria-label="Cancel">
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => onConfirm(Number(selectedIndex))}
            aria-label="Confirm"
          >
            Confirm
          </Button>
        </div>
      )}
    >
      <RadioInput
        name="photons-to-photos-focal-length"
        label="Focal Length"
        options={options}
        value={selectedIndex}
        onChange={setSelectedIndex}
      />
    </Modal>
  );
}
