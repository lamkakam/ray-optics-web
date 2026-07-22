/**
# `features/lens-editor/components/LensPrescriptionContainer/AddReferenceSurfaceModal/AddReferenceSurfaceModal.tsx`

Confirmation modal shown after a successful Reverse formatting operation when the resulting first physical surface has nonzero tilt or decenter.

## Modal Footer

- No and Yes actions are passed to `Modal.footer` so they remain fixed outside the explanatory body.
*/
"use client";

import { Button } from "@/shared/components/primitives/Button";
import { Modal } from "@/shared/components/primitives/Modal";
import { Paragraph } from "@/shared/components/primitives/Paragraph";

interface AddReferenceSurfaceModalProps {
  readonly isOpen: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

/**
## Behavior

- Uses the shared `Modal` primitive with title `Add Reference Surface?`.
- Explains that rayoptics wavefront and OPD calculations can be unreliable when the first physical surface is tilted or decentered, and that a flat air reference surface after Object avoids the topology issue.
- `No` calls `onCancel` so the caller can apply the reversed rows unchanged.
- `Yes` calls `onConfirm` so the caller can insert a flat air reference surface before applying rows.
*/
export function AddReferenceSurfaceModal({
  isOpen,
  onConfirm,
  onCancel,
}: AddReferenceSurfaceModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      title="Add Reference Surface?"
      footer={(
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>
            No
          </Button>
          <Button variant="primary" onClick={onConfirm}>
            Yes
          </Button>
        </div>
      )}
    >
      <Paragraph variant="body" className="mb-6">
        The reversed prescription starts with a tilted or decentered physical surface. Rayoptics wavefront and OPD
        calculations can be unreliable in that topology; a flat air reference surface after Object avoids the issue.
      </Paragraph>
    </Modal>
  );
}
