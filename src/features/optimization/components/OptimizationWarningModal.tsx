"use client";

import { Button } from "@/shared/components/primitives/Button";
import { Modal } from "@/shared/components/primitives/Modal";
import { Paragraph } from "@/shared/components/primitives/Paragraph";

interface OptimizationWarningModalProps {
  readonly isOpen: boolean;
  readonly message: string;
  readonly onClose: () => void;
}

export function OptimizationWarningModal({
  isOpen,
  message,
  onClose,
}: OptimizationWarningModalProps) {
  return (
    <Modal isOpen={isOpen} title="Warning">
      <Paragraph className="mb-6">{message}</Paragraph>
      <div className="flex justify-end">
        <Button variant="primary" onClick={onClose}>
          OK
        </Button>
      </div>
    </Modal>
  );
}
