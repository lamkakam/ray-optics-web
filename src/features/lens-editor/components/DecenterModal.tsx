"use client";

import React, { useState } from "react";
import { Button } from "@/shared/components/primitives/Button";
import { Input } from "@/shared/components/primitives/Input";
import { Label } from "@/shared/components/primitives/Label";
import { Modal } from "@/shared/components/primitives/Modal";
import { Select } from "@/shared/components/primitives/Select";
import { type DecenterConfig } from "@/shared/lib/types/opticalModel";

type DecenterCoordinateSystemStrategy = DecenterConfig["coordinateSystemStrategy"];
export type DecenterType = DecenterConfig;

interface DecenterModalProps {
  readonly isOpen: boolean;
  readonly initialDecenter: DecenterType | undefined;
  readonly readOnly?: boolean;
  readonly onConfirm: (decenter: DecenterType) => void;
  readonly onClose: () => void;
  readonly onRemove: () => void;
}

function parseNumericString(s: string, fallback: number): number {
  const trimmed = s.trim();
  if (trimmed === "") return fallback;
  const v = parseFloat(trimmed);
  return Number.isFinite(v) ? v : fallback;
}

const POS_AND_ORIENTATION_OPTIONS = [
  { value: "bend", label: "Tilt & decenter for this surface; double tilt for following surfaces" },
  { value: "dec and return", label: "Apply to this surface only; restore previous coordinate system for following surfaces" },
  { value: "decenter", label: "New coordinate system for this and following surfaces" },
  { value: "reverse", label: "No change to this surface; reversed coordinate system for following surfaces" },
];

export function DecenterModal({
  isOpen,
  initialDecenter,
  readOnly = false,
  onConfirm,
  onClose,
  onRemove,
}: DecenterModalProps) {
  const init = initialDecenter ?? {
    coordinateSystemStrategy: "bend" as DecenterCoordinateSystemStrategy,
    alpha: 0,
    beta: 0,
    gamma: 0,
    offsetX: 0,
    offsetY: 0,
  };

  const [posAndOrientation, setPosAndOrientation] = useState<DecenterCoordinateSystemStrategy>(init.coordinateSystemStrategy);
  const [alphaStr, setAlphaStr] = useState(String(init.alpha));
  const [betaStr, setBetaStr] = useState(String(init.beta));
  const [gammaStr, setGammaStr] = useState(String(init.gamma));
  const [offsetXStr, setOffsetXStr] = useState(String(init.offsetX));
  const [offsetYStr, setOffsetYStr] = useState(String(init.offsetY));

  const handleConfirm = () => {
    onConfirm({
      coordinateSystemStrategy: posAndOrientation,
      alpha: parseNumericString(alphaStr, init.alpha),
      beta: parseNumericString(betaStr, init.beta),
      gamma: parseNumericString(gammaStr, init.gamma),
      offsetX: parseNumericString(offsetXStr, init.offsetX),
      offsetY: parseNumericString(offsetYStr, init.offsetY),
    });
  };

  return (
    <Modal isOpen={isOpen} title="Tilt & Decenter" titleId="decenter-modal-title" size="md">
      {/* Position & Orientation */}
      <div className="mb-4">
        <Label htmlFor="pos-and-orientation">Coordinate system for this and following surfaces</Label>
        <Select
          id="pos-and-orientation"
          aria-label="Coordinate system for this and following surfaces"
          value={posAndOrientation}
          disabled={readOnly}
          onChange={(e) => setPosAndOrientation(e.target.value as DecenterCoordinateSystemStrategy)}
          options={POS_AND_ORIENTATION_OPTIONS}
        />
      </div>

      {/* Tilt angles: Alpha, Beta, Gamma */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <Label htmlFor="decenter-alpha">Alpha (°)</Label>
          <Input
            id="decenter-alpha"
            aria-label="Alpha (°)"
            type="text"
            value={alphaStr}
            disabled={readOnly}
            onChange={(e) => setAlphaStr(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="decenter-beta">Beta (°)</Label>
          <Input
            id="decenter-beta"
            aria-label="Beta (°)"
            type="text"
            value={betaStr}
            disabled={readOnly}
            onChange={(e) => setBetaStr(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="decenter-gamma">Gamma (°)</Label>
          <Input
            id="decenter-gamma"
            aria-label="Gamma (°)"
            type="text"
            value={gammaStr}
            disabled={readOnly}
            onChange={(e) => setGammaStr(e.target.value)}
          />
        </div>
      </div>

      {/* Offsets: X, Y */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <Label htmlFor="decenter-offset-x">Offset X</Label>
          <Input
            id="decenter-offset-x"
            aria-label="Offset X"
            type="text"
            value={offsetXStr}
            disabled={readOnly}
            onChange={(e) => setOffsetXStr(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="decenter-offset-y">Offset Y</Label>
          <Input
            id="decenter-offset-y"
            aria-label="Offset Y"
            type="text"
            value={offsetYStr}
            disabled={readOnly}
            onChange={(e) => setOffsetYStr(e.target.value)}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4">
        {readOnly ? (
          <div className="flex justify-end w-full">
            <Button variant="secondary" onClick={onClose}>Close</Button>
          </div>
        ) : (
          <>
            <Button variant="danger" onClick={onRemove}>Remove Decenter</Button>
            <span className="flex-1" />
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={handleConfirm}>Confirm</Button>
          </>
        )}
      </div>
    </Modal>
  );
}
