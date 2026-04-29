"use client";

import { Button } from "@/shared/components/primitives/Button";
import { Modal } from "@/shared/components/primitives/Modal";
import { Paragraph } from "@/shared/components/primitives/Paragraph";

interface UnappliedOptimizationResultModalProps {
  readonly isOpen: boolean;
  readonly onStay: () => void;
  readonly onLeave: () => void;
  readonly onApplyToEditor: () => void;
}

export function UnappliedOptimizationResultModal({
  isOpen,
  onStay,
  onLeave,
  onApplyToEditor,
}: UnappliedOptimizationResultModalProps) {
  return (
    <Modal isOpen={isOpen} title="Unapplied Optimization Result">
      <Paragraph className="mb-6">
        The optimized optical model has not been applied to the Editor and may be lost if you leave Optimization.
      </Paragraph>
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="secondary" onClick={onStay}>
          Stay
        </Button>
        <Button variant="secondary" onClick={onLeave}>
          Leave
        </Button>
        <Button variant="primary" onClick={onApplyToEditor}>
          Apply to Editor
        </Button>
      </div>
    </Modal>
  );
}
