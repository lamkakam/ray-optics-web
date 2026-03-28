"use client";

import React from "react";
import { Modal } from "@/components/micro/Modal";
import { Button } from "@/components/micro/Button";
import { Paragraph } from "@/components/micro/Paragraph";

interface ConfirmOverwriteModalProps {
  readonly isOpen: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

export function ConfirmOverwriteModal({ isOpen, onConfirm, onCancel }: ConfirmOverwriteModalProps) {
  return (
    <Modal isOpen={isOpen} title="Load Example System">
      <Paragraph variant="body" className="mb-6">
        This will overwrite your current configuration. Continue?
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
