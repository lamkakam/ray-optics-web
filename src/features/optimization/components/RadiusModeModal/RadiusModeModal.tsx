/**
# `features/optimization/components/LensPrescriptionGrid/RadiusModeModal/RadiusModeModal.tsx`

Renders the radius variable/pickup modal with modal-local draft state.

## Modal Footer

- Cancel and Confirm actions are passed to `Modal.footer` so they remain fixed while radius mode controls scroll.
*/
"use client";

import React from "react";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import type { RadiusMode, RadiusModeDraft } from "@/features/optimization/stores/optimizationStore";
import { getRadiusLabel, getRadiusValue } from "@/features/optimization/lib/optimizationViewModels";
import { ModeSelectField } from "@/features/optimization/components/OptimizationLensPrescriptionGrid/ModeSelectField";
import { PickupModeFields } from "@/features/optimization/components/OptimizationLensPrescriptionGrid/PickupModeFields";
import {
  CURVATURE_RADIUS_GUIDANCE_TEXT,
  curvatureRadiusNoZeroStraddleRule,
  createPickupDraft,
  createVariableDraft,
  getRadiusPickupSourceSurfaceOptions,
  minLessThanMaxRule,
  serializeRadiusMode,
  toRadiusModeDraft,
  validateVariableBounds,
} from "@/features/optimization/lib/modalHelpers";
import { getVariableModeFieldsRenderer } from "@/features/optimization/lib/variableModeFields";
import { Button } from "@/shared/components/primitives/Button";
import { Modal } from "@/shared/components/primitives/Modal";
import { Paragraph } from "@/shared/components/primitives/Paragraph";

interface RadiusModeModalProps {
  readonly isOpen: boolean;
  readonly optimizationModel: OpticalModel | undefined;
  readonly surfaceIndex: number | undefined;
  readonly selectedMode: RadiusMode | undefined;
  readonly canUseBounds?: boolean;
  readonly onSetMode: (surfaceIndex: number, mode: RadiusModeDraft) => void;
  readonly onClose: () => void;
}

/**
## Behavior

- Seeds its local draft from the currently selected radius mode when the modal editor mounts, and resets that draft by remounting a keyed inner editor whenever the committed target surface or mode changes.
- Reuses shared helper functions from `features/optimization/lib/modalHelpers.ts` for draft seeding, mode options, keyed remount serialization, default mode transitions, curvature-radius guidance/error copy, and bounded variable validation.
- Delegates the shared mode selector plus variable/pickup form sections to the `ModeSelectField` and `PickupModeFields` nested directory barrels under `features/optimization/components/LensPrescriptionGrid/`, plus the boolean-driven renderer helper in `features/optimization/lib/variableModeFields.tsx`, while keeping radius-specific draft transitions, copy, and validation in this modal.
- Lets users switch between `constant`, `variable`, and `pickup` modes and edit the relevant fields without mutating the parent optimization state while the modal remains open.
- In `pickup` mode, renders the source surface as a dropdown containing every real surface plus `Image`, with the current target surface omitted.
- In bounded `variable` mode (`canUseBounds === true`), shows helper copy explaining that `R = 0` is a flat surface with infinite radius and that bounds must remain entirely negative or entirely positive.
- In unbounded `variable` mode (`canUseBounds === false`), hides `Min.` / `Max.` inputs and suppresses the flat-surface guidance and zero-crossing validation copy.
- Renders a footer with `Cancel` and `Confirm`, with `Cancel` on the left and `Confirm` on the right.
- In bounded `variable` mode, disables `Confirm` and shows the first inline validation message when the entered min/max bounds are non-finite, `min >= max`, or straddle `0`. Min/max ordering is checked before the curvature-radius zero-straddling rule.
- `Cancel` closes the modal and discards any uncommitted draft changes.
- Commits the latest draft through `onSetMode(surfaceIndex, draft)` only when the user presses `Confirm`.
- Clicking or touching outside the modal does not close it.
- Pressing `Escape` does not close it.
*/
export function RadiusModeModal({
  isOpen,
  optimizationModel,
  surfaceIndex,
  selectedMode,
  canUseBounds = true,
  onSetMode,
  onClose,
}: RadiusModeModalProps) {
  if (!isOpen || optimizationModel === undefined || surfaceIndex === undefined || selectedMode === undefined) {
    return (
      <Modal isOpen={false} title="Radius Variable / Pickup">
        <></>
      </Modal>
    );
  }

  return (
    <RadiusModeModalEditor
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

interface RadiusModeModalEditorProps {
  readonly optimizationModel: OpticalModel;
  readonly surfaceIndex: number;
  readonly selectedMode: RadiusMode;
  readonly canUseBounds: boolean;
  readonly onSetMode: (surfaceIndex: number, mode: RadiusModeDraft) => void;
  readonly onClose: () => void;
}

function RadiusModeModalEditor({
  optimizationModel,
  surfaceIndex,
  selectedMode,
  canUseBounds,
  onSetMode,
  onClose,
}: RadiusModeModalEditorProps) {
  const [draftMode, setDraftMode] = React.useState<RadiusModeDraft>(() => toRadiusModeDraft(selectedMode));
  const VariableModeFields = getVariableModeFieldsRenderer(canUseBounds);

  const radiusValue = getRadiusValue(optimizationModel, surfaceIndex);
  const sourceSurfaceOptions = React.useMemo(
    () => getRadiusPickupSourceSurfaceOptions(optimizationModel.surfaces.length, surfaceIndex),
    [optimizationModel.surfaces.length, surfaceIndex],
  );
  const variableBoundsErrorText = canUseBounds && draftMode.mode === "variable"
    ? validateVariableBounds("Radius", draftMode.min, draftMode.max, [
      minLessThanMaxRule,
      curvatureRadiusNoZeroStraddleRule,
    ])
    : undefined;

  return (
    <Modal
      isOpen
      title="Radius Variable / Pickup"
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
          {getRadiusLabel(surfaceIndex, optimizationModel)} radius: {radiusValue}
        </Paragraph>
        <ModeSelectField
          id="radius-mode"
          label="Mode"
          ariaLabel="Radius mode"
          value={draftMode.mode}
          onChange={(mode) => {
            if (mode === "constant") {
              setDraftMode({ mode });
              return;
            }

            if (mode === "variable") {
              setDraftMode(createVariableDraft(radiusValue));
              return;
            }

            setDraftMode(createPickupDraft());
          }}
        />

        {draftMode.mode === "variable" ? (
          <VariableModeFields.Component
            idPrefix="radius"
            minAriaLabel="Min."
            minValue={draftMode.min}
            maxAriaLabel="Max."
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
            guidanceText={canUseBounds ? CURVATURE_RADIUS_GUIDANCE_TEXT : undefined}
            errorText={variableBoundsErrorText}
          />
        ) : null}

        {draftMode.mode === "pickup" ? (
          <PickupModeFields
            idPrefix="pickup"
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
            scaleAriaLabel="scale"
            scaleValue={draftMode.scale}
            onScaleChange={(value) => setDraftMode({
              mode: "pickup",
              sourceSurfaceIndex: draftMode.sourceSurfaceIndex,
              scale: value,
              offset: draftMode.offset,
            })}
            offsetAriaLabel="offset"
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
