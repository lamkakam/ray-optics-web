"use client";

import React, { useState } from "react";
import { Button } from "@/components/micro/Button";
import { Input } from "@/components/micro/Input";
import { Label } from "@/components/micro/Label";
import { Modal } from "@/components/micro/Modal";
import { Select } from "@/components/micro/Select";
import { type DecenterConfig } from "@/lib/opticalModel";

type DecenterCoordinateSystemStrategy = DecenterConfig["coordinateSystemStrategy"];
export type DecenterType = DecenterConfig;

interface DecenterModalProps {
  readonly isOpen: boolean;
  readonly initialDecenter: DecenterType | undefined;
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
  { value: "bend", label: "bend" },
  { value: "dec and return", label: "dec and return" },
  { value: "decenter", label: "decenter" },
  { value: "reverse", label: "reverse" },
];

export function DecenterModal({
  isOpen,
  initialDecenter,
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
        <Label htmlFor="pos-and-orientation">Position & Orientation</Label>
        <Select
          id="pos-and-orientation"
          aria-label="Position & Orientation"
          value={posAndOrientation}
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
            onChange={(e) => setOffsetYStr(e.target.value)}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4">
        <Button variant="danger" onClick={onRemove}>Remove Decenter</Button>
        <span className="flex-1" />
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={handleConfirm}>Confirm</Button>
      </div>
    </Modal>
  );
}
