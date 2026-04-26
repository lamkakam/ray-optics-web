"use client";

import { Modal } from "@/shared/components/primitives/Modal";
import { Button } from "@/shared/components/primitives/Button";
import { Paragraph } from "@/shared/components/primitives/Paragraph";

interface ConfirmImportModalProps {
  readonly isOpen: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

export function ConfirmImportModal({ isOpen, onConfirm, onCancel }: ConfirmImportModalProps) {
  return (
    <Modal isOpen={isOpen} title="Load Config">
      <Paragraph variant="body" className="mb-6">
        This will overwrite your current System Specs and Lens Prescription. Continue?
      </Paragraph>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" onClick={onConfirm}>
          Load
        </Button>
      </div>
    </Modal>
  );
}
