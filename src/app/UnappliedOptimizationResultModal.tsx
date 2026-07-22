/**
 * Describes the Unapplied Optimization Result Modal module.
 *
 * @remarks
 * ## Modal Footer
 *
 * - Stay, Leave, and Apply to Editor actions are passed to `Modal.footer` so they remain fixed while the modal body scrolls.
 */
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

/**
 * Shell-level warning dialog shown when the user tries to leave `/optimization` while a completed optimization result has updated only the Optimization-local optical model.
 *
 * @remarks
 * ## Behavior
 *
 * - Renders `Modal` with title `"Unapplied Optimization Result"`.
 * - Warns that the optimized optical model has not been applied to the Editor and may be lost if the user leaves Optimization.
 * - Offers explicit `Stay`, `Leave`, and `Apply to Editor` actions.
 * - Does not pass `onBackdropClick`, so backdrop clicks do not dismiss the dialog.
 */
export function UnappliedOptimizationResultModal({
  isOpen,
  onStay,
  onLeave,
  onApplyToEditor,
}: UnappliedOptimizationResultModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      title="Unapplied Optimization Result"
      footer={(
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
      )}
    >
      <Paragraph className="mb-6">
        The optimized optical model has not been applied to the Editor and may be lost if you leave Optimization.
      </Paragraph>
    </Modal>
  );
}
