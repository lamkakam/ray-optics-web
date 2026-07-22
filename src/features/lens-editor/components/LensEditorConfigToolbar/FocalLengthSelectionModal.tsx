/**
 * Describes the Focal Length Selection Modal module.
 *
 * @remarks
 * ## Modal Footer
 *
 * - Cancel and Confirm actions are passed to `Modal.footer` so they remain fixed while the focal-length choices scroll.
 */
"use client";

import { useState } from "react";
import { Button } from "@/shared/components/primitives/Button";
import { Modal } from "@/shared/components/primitives/Modal";
import { RadioInput, type RadioOption } from "@/shared/components/primitives/RadioInput";
import type { PhotonsToPhotosFocalLengthChoice } from "@/features/lens-editor/lib/photonsToPhotosParser";

interface FocalLengthSelectionModalProps {
  /** Controls visibility */
  readonly isOpen: boolean;
  /** Available focal-length columns */
  readonly choices: readonly PhotonsToPhotosFocalLengthChoice[];
  /** Resolves the selected column */
  readonly onConfirm: (choiceIndex: number) => void;
  /** Aborts the TXT import */
  readonly onCancel: () => void;
}

/**
 * Toolbar-local modal for choosing a focal-length column when importing a zoom Photons to Photos `.txt` file.
 *
 * @remarks
 * ## Behavior
 *
 * - Renders a non-backdrop-dismissible `Modal` titled `Select Focal Length`.
 * - Uses shared `RadioInput` with labels like `24.376 mm`; the first choice is selected initially.
 * - `Cancel` closes without importing. `Confirm` passes the selected choice index back to the toolbar.
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
