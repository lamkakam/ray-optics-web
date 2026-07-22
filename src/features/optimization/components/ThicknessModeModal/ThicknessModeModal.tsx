"use client";
/**
 * Renders the thickness variable/pickup modal with modal-local draft state.
 *
 * @remarks
 * ## Modal Footer
 *
 * - Cancel and Confirm actions are passed to `Modal.footer` so they remain fixed while thickness mode controls scroll.
 */

import React from "react";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import type { RadiusMode, RadiusModeDraft } from "@/features/optimization/stores/optimizationStore";
import { ModeSelectField } from "@/features/optimization/components/OptimizationLensPrescriptionGrid/ModeSelectField";
import { PickupModeFields } from "@/features/optimization/components/OptimizationLensPrescriptionGrid/PickupModeFields";
import { getRadiusLabel, getThicknessValue } from "@/features/optimization/lib/optimizationViewModels";
import {
  createPickupDraft,
  createVariableDraft,
  getThicknessPickupSourceSurfaceOptions,
  minLessThanMaxRule,
  serializeRadiusMode,
  toRadiusModeDraft,
  validateVariableBounds,
} from "@/features/optimization/lib/modalHelpers";
import { getVariableModeFieldsRenderer } from "@/features/optimization/lib/variableModeFields";
import { Button } from "@/shared/components/primitives/Button";
import { Modal } from "@/shared/components/primitives/Modal";
import { Paragraph } from "@/shared/components/primitives/Paragraph";

interface ThicknessModeModalProps {
  readonly isOpen: boolean;
  readonly optimizationModel: OpticalModel | undefined;
  readonly surfaceIndex: number | undefined;
  readonly selectedMode: RadiusMode | undefined;
  readonly canUseBounds?: boolean;
  readonly onSetMode: (surfaceIndex: number, mode: RadiusModeDraft) => void;
  readonly onClose: () => void;
}

/**
 * Describes the Thickness Mode Modal module.
 *
 * @remarks
 * ## Behavior
 *
 * - Seeds its local draft from the currently selected thickness mode when the modal editor mounts, and resets that draft by remounting a keyed inner editor whenever the committed target surface or mode changes.
 * - Reuses shared helper functions from `features/optimization/lib/modalHelpers.ts` for draft seeding, mode options, keyed remount serialization, default mode transitions, and bounded variable validation.
 * - Delegates the shared mode selector plus variable/pickup form sections to the `ModeSelectField` and `PickupModeFields` nested directory barrels under `features/optimization/components/LensPrescriptionGrid/`, plus the boolean-driven renderer helper in `features/optimization/lib/variableModeFields.tsx`, while keeping thickness-specific draft transitions and summary text in this modal.
 * - Lets users switch between `constant`, `variable`, and `pickup` modes and edit the relevant fields without mutating the parent optimization state while the modal remains open.
 * - In `pickup` mode, renders the source surface as a dropdown containing only real surfaces, with the current target surface omitted.
 * - In bounded `variable` mode (`canUseBounds === true`), renders `Thickness Min.` / `Thickness Max.` inputs.
 * - In unbounded `variable` mode (`canUseBounds === false`), hides those bounds inputs.
 * - Renders a footer with `Cancel` and `Confirm`, with `Cancel` on the left and `Confirm` on the right.
 * - In bounded `variable` mode, disables `Confirm` and shows the shared inline validation message when either bound is non-finite or the numeric minimum is greater than or equal to the numeric maximum.
 * - `Cancel` closes the modal and discards any uncommitted draft changes.
 * - Commits the latest draft through `onSetMode(surfaceIndex, draft)` only when the user presses `Confirm`.
 * - Clicking or touching outside the modal does not close it.
 * - Pressing `Escape` does not close it.
 */
export function ThicknessModeModal({
  isOpen,
  optimizationModel,
  surfaceIndex,
  selectedMode,
  canUseBounds = true,
  onSetMode,
  onClose,
}: ThicknessModeModalProps) {
  if (!isOpen || optimizationModel === undefined || surfaceIndex === undefined || selectedMode === undefined) {
    return (
      <Modal isOpen={false} title="Thickness Variable / Pickup">
        <></>
      </Modal>
    );
  }

  return (
    <ThicknessModeModalEditor
      key={`${surfaceIndex}:${serializeRadiusMode(selectedMode)}`}
      optimizationModel={optimizationModel}
      surfaceIndex={surfaceIndex}
      selectedMode={selectedMode}
      canUseBounds={canUseBounds}
      onSetMode={onSetMode}
      onClose={onClose}
    />
  );
}

interface ThicknessModeModalEditorProps {
  readonly optimizationModel: OpticalModel;
  readonly surfaceIndex: number;
  readonly selectedMode: RadiusMode;
  readonly canUseBounds: boolean;
  readonly onSetMode: (surfaceIndex: number, mode: RadiusModeDraft) => void;
  readonly onClose: () => void;
}

function ThicknessModeModalEditor({
  optimizationModel,
  surfaceIndex,
  selectedMode,
  canUseBounds,
  onSetMode,
  onClose,
}: ThicknessModeModalEditorProps) {
  const [draftMode, setDraftMode] = React.useState<RadiusModeDraft>(() => toRadiusModeDraft(selectedMode));
  const VariableModeFields = getVariableModeFieldsRenderer(canUseBounds);

  const thicknessValue = getThicknessValue(optimizationModel, surfaceIndex);
  const sourceSurfaceOptions = React.useMemo(
    () => getThicknessPickupSourceSurfaceOptions(optimizationModel.surfaces.length, surfaceIndex),
    [optimizationModel.surfaces.length, surfaceIndex],
  );
  const variableBoundsErrorText = canUseBounds && draftMode.mode === "variable"
    ? validateVariableBounds("Thickness", draftMode.min, draftMode.max, [minLessThanMaxRule])
    : undefined;

  return (
    <Modal
      isOpen
      title="Thickness Variable / Pickup"
      footer={(
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={variableBoundsErrorText !== undefined}
            onClick={() => {
              onSetMode(surfaceIndex, draftMode);
              onClose();
            }}
          >
            Confirm
          </Button>
        </div>
      )}
    >
      <div className="space-y-4">
        <Paragraph>
          {getRadiusLabel(surfaceIndex, optimizationModel)} thickness: {thicknessValue}
        </Paragraph>
        <ModeSelectField
          id="thickness-mode"
          label="Mode"
          ariaLabel="Thickness mode"
          value={draftMode.mode}
          onChange={(mode) => {
            if (mode === "constant") {
              setDraftMode({ mode });
              return;
            }

            if (mode === "variable") {
              setDraftMode(createVariableDraft(thicknessValue));
              return;
            }

            setDraftMode(createPickupDraft());
          }}
        />

        {draftMode.mode === "variable" ? (
          <VariableModeFields.Component
            idPrefix="thickness"
            minAriaLabel="Thickness Min."
            minValue={draftMode.min}
            maxAriaLabel="Thickness Max."
            maxValue={draftMode.max}
            onMinChange={(value) => setDraftMode({
              mode: "variable",
              min: value,
              max: draftMode.max,
            })}
            onMaxChange={(value) => setDraftMode({
              mode: "variable",
              min: draftMode.min,
              max: value,
            })}
            className="grid gap-4 md:grid-cols-2"
            inputRowClassName="contents"
            errorText={variableBoundsErrorText}
            errorTextClassName="md:col-span-2"
          />
        ) : null}

        {draftMode.mode === "pickup" ? (
          <PickupModeFields
            idPrefix="pickup-thickness"
            sourceSurfaceLabel="Source surface"
            sourceSurfaceAriaLabel="Source surface"
            sourceSurfaceValue={draftMode.sourceSurfaceIndex}
            sourceSurfaceOptions={sourceSurfaceOptions}
            onSourceSurfaceChange={(value) => setDraftMode({
              mode: "pickup",
              sourceSurfaceIndex: value,
              scale: draftMode.scale,
              offset: draftMode.offset,
            })}
            scaleAriaLabel="Thickness scale"
            scaleValue={draftMode.scale}
            onScaleChange={(value) => setDraftMode({
              mode: "pickup",
              sourceSurfaceIndex: draftMode.sourceSurfaceIndex,
              scale: value,
              offset: draftMode.offset,
            })}
            offsetAriaLabel="Thickness offset"
            offsetValue={draftMode.offset}
            onOffsetChange={(value) => setDraftMode({
              mode: "pickup",
              sourceSurfaceIndex: draftMode.sourceSurfaceIndex,
              scale: draftMode.scale,
              offset: value,
            })}
          />
        ) : null}
      </div>
    </Modal>
  );
}
