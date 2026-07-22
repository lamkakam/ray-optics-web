"use client";

import { MODAL_MODE_OPTIONS } from "@/features/optimization/lib/modalHelpers";
import { Label } from "@/shared/components/primitives/Label";
import { Select } from "@/shared/components/primitives/Select";
import type { ModalModeChoice } from "@/features/optimization/types/optimizationModalTypes";

interface ModeSelectFieldProps {
  readonly id: string;
  readonly label?: string;
  readonly ariaLabel: string;
  readonly value: ModalModeChoice;
  readonly onChange: (value: ModalModeChoice) => void;
}

/**
 *
 * @remarks
 * ## Behavior
 *
 * - Renders the shared optimization mode dropdown using `MODAL_MODE_OPTIONS` from `modalHelpers.ts`.
 * - Preserves caller-owned label text and aria-labels so consuming modals keep their existing copy and accessibility names.
 * - Does not own state; callers pass the current mode and receive the selected `ModalModeChoice` from `features/optimization/types/optimizationModalTypes.ts` through `onChange`.
 */
export function ModeSelectField({
  id,
  label,
  ariaLabel,
  value,
  onChange,
}: ModeSelectFieldProps) {
  return (
    <div>
      {label ? <Label htmlFor={id}>{label}</Label> : null}
      <Select
        id={id}
        aria-label={ariaLabel}
        value={value}
        options={MODAL_MODE_OPTIONS}
        onChange={(event) => onChange(event.target.value as ModalModeChoice)}
      />
    </div>
  );
}
