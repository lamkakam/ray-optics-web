"use client";

import { Button } from "@/shared/components/primitives/Button";
import { Modal } from "@/shared/components/primitives/Modal";
import { Paragraph } from "@/shared/components/primitives/Paragraph";

interface ErrorModalProps {
  /** Controls visibility */
  readonly isOpen: boolean;
  /** Called when the OK button is clicked */
  readonly onClose: () => void;
  /** Custom error text. Defaults to a generic validation message */
  readonly message?: string;
}

/**
 * Pre-built error dialog that wraps `Modal` with a fixed "Error" title and a single "OK" dismiss button. Shows a customizable error message or a default validation message.
 *
 * @remarks
 * ## Key Behaviors
 *
 * - No backdrop-click dismissal (omits `onBackdropClick`), requiring explicit OK press.
 *
 *
 *
 * ## Modal Footer
 *
 * - The OK action is passed to `Modal.footer` so it remains fixed outside the message body.
 */
export function ErrorModal({ isOpen, onClose, message }: ErrorModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      title="Error"
      size="md"
      footer={(
        <div className="flex justify-end">
          <Button variant="primary" onClick={onClose}>OK</Button>
        </div>
      )}
    >
      <Paragraph className="mb-6">
        {message ?? "The input parameters are invalid. Please check your specifications and prescription."}
      </Paragraph>
    </Modal>
  );
}
