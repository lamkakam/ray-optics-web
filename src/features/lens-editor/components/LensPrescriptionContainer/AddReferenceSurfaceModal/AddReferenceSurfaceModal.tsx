"use client";

import { Button } from "@/shared/components/primitives/Button";
import { Modal } from "@/shared/components/primitives/Modal";
import { Paragraph } from "@/shared/components/primitives/Paragraph";

interface AddReferenceSurfaceModalProps {
  readonly isOpen: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

export function AddReferenceSurfaceModal({
  isOpen,
  onConfirm,
  onCancel,
}: AddReferenceSurfaceModalProps) {
  return (
    <Modal isOpen={isOpen} title="Add Reference Surface?">
      <Paragraph variant="body" className="mb-6">
        The reversed prescription starts with a tilted or decentered physical surface. Rayoptics wavefront and OPD
        calculations can be unreliable in that topology; a flat air reference surface after Object avoids the issue.
      </Paragraph>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onCancel}>
          No
        </Button>
        <Button variant="primary" onClick={onConfirm}>
          Yes
        </Button>
      </div>
    </Modal>
  );
}
