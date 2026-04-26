"use client";

import React from "react";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import type { RadiusMode, RadiusModeDraft } from "@/features/optimization/stores/optimizationStore";
import { getRadiusLabel, getRadiusValue } from "@/features/optimization/components/optimizationViewModels";
import { ModeSelectField } from "@/features/optimization/components/ModeSelectField";
import { PickupModeFields } from "@/features/optimization/components/PickupModeFields";
import {
  CURVATURE_RADIUS_GUIDANCE_TEXT,
  createPickupDraft,
  createVariableDraft,
  curvatureRadiusCrossesZero,
  getCurvatureRadiusBoundsErrorText,
  getRadiusPickupSourceSurfaceOptions,
  serializeRadiusMode,
  toRadiusModeDraft,
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
  const variableBoundsCrossZero = canUseBounds
    && draftMode.mode === "variable"
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
            errorText={variableBoundsCrossZero ? getCurvatureRadiusBoundsErrorText("Radius") : undefined}
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
