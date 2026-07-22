/**
Confirmation modal used before loading an example optical system.

## Modal Footer

- Cancel and Load actions are passed to `Modal.footer` so they remain fixed outside the message body.
*/
"use client";

import { Modal } from "@/shared/components/primitives/Modal";
import { Button } from "@/shared/components/primitives/Button";
import { Paragraph } from "@/shared/components/primitives/Paragraph";

interface ConfirmOverwriteModalProps {
  /** Controls modal visibility */
  readonly isOpen: boolean;
  /** Confirms overwrite and continues loading */
  readonly onConfirm: () => void;
  /** Cancels loading */
  readonly onCancel: () => void;
}

export function ConfirmOverwriteModal({ isOpen, onConfirm, onCancel }: ConfirmOverwriteModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      title="Load Example System"
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
        This will overwrite your current configuration. Continue?
      </Paragraph>
    </Modal>
  );
}
