"use client";

import React from "react";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import type { RadiusMode, RadiusModeDraft } from "@/features/optimization/stores/optimizationStore";
import { ModeSelectField } from "@/features/optimization/components/LensPrescriptionGrid/ModeSelectField/ModeSelectField";
import { PickupModeFields } from "@/features/optimization/components/LensPrescriptionGrid/PickupModeFields/PickupModeFields";
import { getRadiusLabel, getThicknessValue } from "@/features/optimization/components/optimizationViewModels";
import {
  createPickupDraft,
  createVariableDraft,
  getThicknessPickupSourceSurfaceOptions,
  serializeRadiusMode,
  toRadiusModeDraft,
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

  return (
    <Modal
      isOpen
      title="Thickness Variable / Pickup"
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

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
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
