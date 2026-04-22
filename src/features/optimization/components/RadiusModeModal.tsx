"use client";

import React from "react";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import type { RadiusMode, RadiusModeDraft } from "@/features/optimization/stores/optimizationStore";
import { getRadiusLabel, getRadiusValue } from "@/features/optimization/components/optimizationViewModels";
import { ModeSelectField } from "@/features/optimization/components/ModeSelectField";
import { PickupModeFields } from "@/features/optimization/components/PickupModeFields";
import { BoundedVariableModeFields } from "@/features/optimization/components/BoundedVariableModeFields";
import {
  CURVATURE_RADIUS_GUIDANCE_TEXT,
  createPickupDraft,
  createVariableDraft,
  curvatureRadiusCrossesZero,
  getCurvatureRadiusBoundsErrorText,
  serializeRadiusMode,
  toRadiusModeDraft,
} from "@/features/optimization/lib/modalHelpers";
import { Button } from "@/shared/components/primitives/Button";
import { Modal } from "@/shared/components/primitives/Modal";
import { Paragraph } from "@/shared/components/primitives/Paragraph";

interface RadiusModeModalProps {
  readonly isOpen: boolean;
  readonly optimizationModel: OpticalModel | undefined;
  readonly surfaceIndex: number | undefined;
  readonly selectedMode: RadiusMode | undefined;
  readonly onSetMode: (surfaceIndex: number, mode: RadiusModeDraft) => void;
  readonly onClose: () => void;
}

export function RadiusModeModal({
  isOpen,
  optimizationModel,
  surfaceIndex,
  selectedMode,
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
      onSetMode={onSetMode}
      onClose={onClose}
    />
  );
}

interface RadiusModeModalEditorProps {
  readonly optimizationModel: OpticalModel;
  readonly surfaceIndex: number;
  readonly selectedMode: RadiusMode;
  readonly onSetMode: (surfaceIndex: number, mode: RadiusModeDraft) => void;
  readonly onClose: () => void;
}

function RadiusModeModalEditor({
  optimizationModel,
  surfaceIndex,
  selectedMode,
  onSetMode,
  onClose,
}: RadiusModeModalEditorProps) {
  const [draftMode, setDraftMode] = React.useState<RadiusModeDraft>(() => toRadiusModeDraft(selectedMode));

  const radiusValue = getRadiusValue(optimizationModel, surfaceIndex);
  const variableBoundsCrossZero = draftMode.mode === "variable"
    && curvatureRadiusCrossesZero(draftMode.min, draftMode.max);

  return (
    <Modal
      isOpen
      title="Radius Variable / Pickup"
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
          <BoundedVariableModeFields
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
            guidanceText={CURVATURE_RADIUS_GUIDANCE_TEXT}
            errorText={variableBoundsCrossZero ? getCurvatureRadiusBoundsErrorText("Radius") : undefined}
          />
        ) : null}

        {draftMode.mode === "pickup" ? (
          <PickupModeFields
            idPrefix="pickup"
            sourceSurfaceAriaLabel="Source surface index"
            sourceSurfaceValue={draftMode.sourceSurfaceIndex}
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

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={variableBoundsCrossZero}
            onClick={() => {
              onSetMode(surfaceIndex, draftMode);
              onClose();
            }}
          >
            Confirm
          </Button>
        </div>
      </div>
    </Modal>
  );
}
