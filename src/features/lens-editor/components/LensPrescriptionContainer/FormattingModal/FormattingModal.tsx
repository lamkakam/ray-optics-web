"use client";

import React, { useMemo } from "react";
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

export type FormattingMode = "scale" | "reverse";

export interface FormattingDraft {
  readonly mode: FormattingMode;
  readonly scaleFactor: string;
  readonly scaleFirstSurface: number;
  readonly scaleLastSurface: number;
  readonly reverseFirstSurface: number;
  readonly reverseLastSurface: number;
}

export interface FormattingDraftActions {
  readonly setMode: (mode: FormattingMode) => void;
  readonly setScaleFactor: (factor: string) => void;
  readonly setScaleFirstSurface: (surface: number) => void;
  readonly setScaleLastSurface: (surface: number) => void;
  readonly setReverseFirstSurface: (surface: number) => void;
  readonly setReverseLastSurface: (surface: number) => void;
}

interface FormattingModalProps {
  readonly isOpen: boolean;
  readonly rows: readonly GridRow[];
  readonly draft: FormattingDraft;
  readonly draftActions: FormattingDraftActions;
  readonly onConfirm: (rows: GridRow[]) => void;
  readonly onCancel: () => void;
  readonly onError: (message: string) => void;
}

const FORMAT_MODE_OPTIONS = [
  { value: "scale" as const, label: "Scale" },
  { value: "reverse" as const, label: "Reverse (also reversing thickness and medium)" },
];

function lastSurfaceIndex(rows: readonly GridRow[]): number {
  return rows.filter((row) => row.kind === "surface").length;
}

function clampSurfaceIndex(value: number, max: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(Math.max(value, 0), max);
}

export function FormattingModal({
  isOpen,
  rows,
  draft,
  draftActions,
  onConfirm,
  onCancel,
  onError,
}: FormattingModalProps) {
  const imageSelectorIndex = lastSurfaceIndex(rows) + 1;
  const scaleOptions = useMemo(() => buildScaleSurfaceOptions(rows), [rows]);
  const reverseOptions = useMemo(() => buildReverseSurfaceOptions(rows), [rows]);
  const currentOptions = draft.mode === "scale" ? scaleOptions : reverseOptions;
  const maxSurfaceIndex = draft.mode === "scale" ? imageSelectorIndex : lastSurfaceIndex(rows);
  const firstSurface = clampSurfaceIndex(
    draft.mode === "scale" ? draft.scaleFirstSurface : draft.reverseFirstSurface,
    maxSurfaceIndex
  );
  const lastSurface = clampSurfaceIndex(
    draft.mode === "scale" ? draft.scaleLastSurface : draft.reverseLastSurface,
    maxSurfaceIndex
  );

  function handleConfirm() {
    const result = draft.mode === "scale"
      ? formatPrescriptionRows(rows, {
          mode: draft.mode,
          first: firstSurface,
          last: lastSurface,
          factor: Number(draft.scaleFactor),
        })
      : formatPrescriptionRows(rows, {
          mode: draft.mode,
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
          value={draft.mode}
          onChange={draftActions.setMode}
        />

        {draft.mode === "scale" && (
          <div>
            <Label htmlFor="formatting-factor">Factor</Label>
            <Input
              id="formatting-factor"
              aria-label="Factor"
              type="number"
              min="0"
              step="any"
              value={draft.scaleFactor}
              onChange={(event) => draftActions.setScaleFactor(event.target.value)}
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
              onChange={(event) => {
                const value = Number(event.target.value);
                if (draft.mode === "scale") {
                  draftActions.setScaleFirstSurface(value);
                  return;
                }

                draftActions.setReverseFirstSurface(value);
              }}
            />
          </div>
          <div>
            <Label htmlFor="formatting-last-surface">Last Surface</Label>
            <Select
              id="formatting-last-surface"
              aria-label="Last Surface"
              options={currentOptions}
              value={lastSurface}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (draft.mode === "scale") {
                  draftActions.setScaleLastSurface(value);
                  return;
                }

                draftActions.setReverseLastSurface(value);
              }}
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
