"use client";

import { Button } from "@/shared/components/primitives/Button";
import { Modal } from "@/shared/components/primitives/Modal";
import { Paragraph } from "@/shared/components/primitives/Paragraph";

interface OptimizationDiscardConfirmModalProps {
  readonly isOpen: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

/**
 * Displays the confirmation dialog shown before discarding the pending optimized prescription and restoring the Lens Editor prescription on the Optimization page.
 *
 * ## Modal Footer
 *
 * - Cancel and danger-styled Discard actions are passed to `Modal.footer` so they remain fixed outside the confirmation body.
 */
export function OptimizationDiscardConfirmModal({
  isOpen,
  onCancel,
  onConfirm,
}: OptimizationDiscardConfirmModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      title="Discard Optimization Result"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            Discard
          </Button>
        </div>
      }
    >
      <Paragraph className="mb-6">
        This will discard the optimized lens prescription and restore the
        prescription from the Lens Editor. Continue?
      </Paragraph>
    </Modal>
  );
}
