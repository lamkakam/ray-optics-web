"use client";

import { useState } from "react";
import { Button } from "@/shared/components/primitives/Button";
import { Modal } from "@/shared/components/primitives/Modal";
import { RadioInput, type RadioOption } from "@/shared/components/primitives/RadioInput";
import type { PhotonsToPhotosFocalLengthChoice } from "@/features/lens-editor/lib/photonsToPhotosParser";

interface FocalLengthSelectionModalProps {
  readonly isOpen: boolean;
  readonly choices: readonly PhotonsToPhotosFocalLengthChoice[];
  readonly onConfirm: (choiceIndex: number) => void;
  readonly onCancel: () => void;
}

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
    <Modal isOpen={isOpen} title="Select Focal Length">
      <RadioInput
        name="photons-to-photos-focal-length"
        label="Focal Length"
        options={options}
        value={selectedIndex}
        onChange={setSelectedIndex}
      />
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
    </Modal>
  );
}
