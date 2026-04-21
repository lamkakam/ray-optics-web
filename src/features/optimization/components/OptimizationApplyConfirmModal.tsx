"use client";

import React from "react";
import { Button } from "@/shared/components/primitives/Button";
import { Modal } from "@/shared/components/primitives/Modal";
import { Paragraph } from "@/shared/components/primitives/Paragraph";

interface OptimizationApplyConfirmModalProps {
  readonly isOpen: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

export function OptimizationApplyConfirmModal({
  isOpen,
  onCancel,
  onConfirm,
}: OptimizationApplyConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} title="Apply to Editor">
      <Paragraph className="mb-6">
        This will overwrite the lens prescription in the editor. Continue?
      </Paragraph>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" onClick={onConfirm}>
          Apply
        </Button>
      </div>
    </Modal>
  );
}
