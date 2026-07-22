/**
# `features/lens-editor/components/LensPrescriptionContainer/DiffractionGratingModal/DiffractionGratingModal.tsx`

## Modal Footer

- Close, Remove, Cancel, and Confirm actions are passed to `Modal.footer` so they remain fixed while diffraction grating fields scroll.
*/
"use client";

import { useState } from "react";
import { Button } from "@/shared/components/primitives/Button";
import { Input } from "@/shared/components/primitives/Input";
import { Label } from "@/shared/components/primitives/Label";
import { Modal } from "@/shared/components/primitives/Modal";
import type { DiffractionGrating } from "@/shared/lib/types/opticalModel";

interface DiffractionGratingModalProps {
  readonly isOpen: boolean;
  readonly initialDiffractionGrating: DiffractionGrating | undefined;
  readonly readOnly?: boolean;
  readonly onConfirm: (diffractionGrating: DiffractionGrating) => void;
  readonly onClose: () => void;
  readonly onRemove: () => void;
}

function parsePositiveNumber(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value.trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseInteger(value: string, fallback: number): number {
  const trimmed = value.trim();
  if (trimmed === "") return fallback;
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) ? parsed : fallback;
}

/**
## Purpose

Modal for configuring diffraction grating parameters on a surface.

## Key Behaviors

- Defaults to `lpmm = 1000` and `order = 1` when the surface has no existing grating.
- Keeps raw input as strings and parses on confirm.
- Invalid `lp/mm` values fall back to the initial positive value.
- Invalid `order` values fall back to the initial integer value.
- `Remove` clears the stored diffraction grating config.
- In `readOnly` mode, both inputs are disabled and the footer renders only `Close`.
*/
export function DiffractionGratingModal({
  isOpen,
  initialDiffractionGrating,
  readOnly = false,
  onConfirm,
  onClose,
  onRemove,
}: DiffractionGratingModalProps) {
  const init = initialDiffractionGrating ?? {
    lpmm: 1000,
    order: 1,
  };

  const [lpmmStr, setLpmmStr] = useState(String(init.lpmm));
  const [orderStr, setOrderStr] = useState(String(init.order));

  const handleConfirm = () => {
    onConfirm({
      lpmm: parsePositiveNumber(lpmmStr, init.lpmm),
      order: parseInteger(orderStr, init.order),
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      title="Diffraction Grating"
      titleId="diffraction-grating-modal-title"
      size="md"
      footer={(
        <div className="flex items-center gap-3">
          {readOnly ? (
            <div className="flex justify-end w-full">
              <Button variant="secondary" onClick={onClose}>Close</Button>
            </div>
          ) : (
            <>
              <Button variant="danger" onClick={onRemove}>Remove</Button>
              <span className="flex-1" />
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button variant="primary" onClick={handleConfirm}>Confirm</Button>
            </>
          )}
        </div>
      )}
    >
      <div className="grid grid-cols-1 gap-4 mb-4">
        <div>
          <Label htmlFor="diffraction-grating-lpmm">lp/mm</Label>
          <Input
            id="diffraction-grating-lpmm"
            aria-label="lp/mm"
            type="text"
            value={lpmmStr}
            disabled={readOnly}
            onChange={(e) => setLpmmStr(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="diffraction-grating-order">order</Label>
          <Input
            id="diffraction-grating-order"
            aria-label="order"
            type="text"
            value={orderStr}
            disabled={readOnly}
            onChange={(e) => setOrderStr(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}
