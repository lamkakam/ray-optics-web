"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/shared/components/primitives/Button";
import { Input } from "@/shared/components/primitives/Input";
import { Label } from "@/shared/components/primitives/Label";
import { Modal } from "@/shared/components/primitives/Modal";
import { RadioInput } from "@/shared/components/primitives/RadioInput";
import { Select } from "@/shared/components/primitives/Select";
import {
  buildReverseSurfaceOptions,
  buildScaleSurfaceOptions,
  formatPrescriptionRows,
} from "@/shared/lib/lens-prescription-grid/lib/prescriptionFormatting";
import type { GridRow } from "@/shared/lib/lens-prescription-grid/types/gridTypes";

type FormattingMode = "scale" | "reverse";

interface FormattingModalProps {
  readonly isOpen: boolean;
  readonly rows: readonly GridRow[];
  readonly onConfirm: (rows: GridRow[]) => void;
  readonly onCancel: () => void;
  readonly onError: (message: string) => void;
}

const FORMAT_MODE_OPTIONS = [
  { value: "scale" as const, label: "Scale" },
  { value: "reverse" as const, label: "Reverse" },
];

function lastSurfaceIndex(rows: readonly GridRow[]): number {
  return rows.filter((row) => row.kind === "surface").length;
}

export function FormattingModal({
  isOpen,
  rows,
  onConfirm,
  onCancel,
  onError,
}: FormattingModalProps) {
  const imageSelectorIndex = lastSurfaceIndex(rows) + 1;
  const [mode, setMode] = useState<FormattingMode>("scale");
  const [factor, setFactor] = useState("1");
  const [firstSurface, setFirstSurface] = useState(0);
  const [lastSurface, setLastSurface] = useState(imageSelectorIndex);

  const scaleOptions = useMemo(() => buildScaleSurfaceOptions(rows), [rows]);
  const reverseOptions = useMemo(() => buildReverseSurfaceOptions(rows), [rows]);
  const currentOptions = mode === "scale" ? scaleOptions : reverseOptions;

  function handleModeChange(nextMode: FormattingMode) {
    setMode(nextMode);
    setFirstSurface(0);
    setLastSurface(nextMode === "scale" ? imageSelectorIndex : lastSurfaceIndex(rows));
  }

  function handleConfirm() {
    const result = mode === "scale"
      ? formatPrescriptionRows(rows, {
          mode,
          first: firstSurface,
          last: lastSurface,
          factor: Number(factor),
        })
      : formatPrescriptionRows(rows, {
          mode,
          first: firstSurface,
          last: lastSurface,
        });

    if (!result.ok) {
      onError(result.error);
      return;
    }

    onConfirm(result.rows);
  }

  return (
    <Modal isOpen={isOpen} title="Formatting" size="md">
      <div className="space-y-4">
        <RadioInput
          name="lens-prescription-formatting-mode"
          label="Mode"
          options={FORMAT_MODE_OPTIONS}
          value={mode}
          onChange={handleModeChange}
        />

        {mode === "scale" && (
          <div>
            <Label htmlFor="formatting-factor">Factor</Label>
            <Input
              id="formatting-factor"
              aria-label="Factor"
              type="number"
              min="0"
              step="any"
              value={factor}
              onChange={(event) => setFactor(event.target.value)}
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="formatting-first-surface">First Surface</Label>
            <Select
              id="formatting-first-surface"
              aria-label="First Surface"
              options={currentOptions}
              value={firstSurface}
              onChange={(event) => setFirstSurface(Number(event.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="formatting-last-surface">Last Surface</Label>
            <Select
              id="formatting-last-surface"
              aria-label="Last Surface"
              options={currentOptions}
              value={lastSurface}
              onChange={(event) => setLastSurface(Number(event.target.value))}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" onClick={handleConfirm}>Confirm</Button>
        </div>
      </div>
    </Modal>
  );
}
