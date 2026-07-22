/**
 * Describes the Confirm Import Modal module.
 *
 * @remarks
 * ## Modal Footer
 *
 * - Cancel and Load actions are passed to `Modal.footer` so they remain fixed outside the message body.
 */
"use client";

import { Modal } from "@/shared/components/primitives/Modal";
import { Button } from "@/shared/components/primitives/Button";
import { Paragraph } from "@/shared/components/primitives/Paragraph";

interface ConfirmImportModalProps {
  /** Controls visibility */
  readonly isOpen: boolean;
  /** Proceeds with the import */
  readonly onConfirm: () => void;
  /** Aborts the import */
  readonly onCancel: () => void;
}

/**
 * Simple confirmation modal that warns the user that loading a config JSON will overwrite their current System Specs and Lens Prescription.
 *
 * @remarks
 * ## Key Behaviors
 *
 * - Stateless — purely presentational.
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
