"use client";

import React from "react";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import type { RadiusMode, RadiusModeDraft } from "@/features/optimization/stores/optimizationStore";
import { getRadiusLabel, getThicknessValue } from "@/features/optimization/components/optimizationViewModels";
import { Button } from "@/shared/components/primitives/Button";
import { Input } from "@/shared/components/primitives/Input";
import { Label } from "@/shared/components/primitives/Label";
import { Modal } from "@/shared/components/primitives/Modal";
import { Paragraph } from "@/shared/components/primitives/Paragraph";
import { Select } from "@/shared/components/primitives/Select";

type VariableChoice = "constant" | "variable" | "pickup";

interface ThicknessModeModalProps {
  readonly isOpen: boolean;
  readonly optimizationModel: OpticalModel | undefined;
  readonly surfaceIndex: number | undefined;
  readonly selectedMode: RadiusMode | undefined;
  readonly onSetMode: (surfaceIndex: number, mode: RadiusModeDraft) => void;
  readonly onClose: () => void;
}

function toDraft(mode: RadiusMode): RadiusModeDraft {
  switch (mode.mode) {
    case "constant":
      return { mode: "constant" };
    case "variable":
      return {
        mode: "variable",
        min: mode.min,
        max: mode.max,
      };
    case "pickup":
      return {
        mode: "pickup",
        sourceSurfaceIndex: mode.sourceSurfaceIndex,
        scale: mode.scale,
        offset: mode.offset,
      };
  }
}

export function ThicknessModeModal({
  isOpen,
  optimizationModel,
  surfaceIndex,
  selectedMode,
  onSetMode,
  onClose,
}: ThicknessModeModalProps) {
  const [draftMode, setDraftMode] = React.useState<RadiusModeDraft | undefined>(undefined);

  React.useEffect(() => {
    if (!isOpen || surfaceIndex === undefined || selectedMode === undefined) {
      setDraftMode(undefined);
      return;
    }

    setDraftMode(toDraft(selectedMode));
  }, [isOpen, selectedMode, surfaceIndex]);

  if (!isOpen || optimizationModel === undefined || surfaceIndex === undefined || selectedMode === undefined || draftMode === undefined) {
    return (
      <Modal isOpen={false} title="Thickness Variable / Pickup">
        <></>
      </Modal>
    );
  }

  const thicknessValue = getThicknessValue(optimizationModel, surfaceIndex);

  return (
    <Modal
      isOpen
      title="Thickness Variable / Pickup"
    >
      <div className="space-y-4">
        <Paragraph>
          {getRadiusLabel(surfaceIndex, optimizationModel)} thickness: {thicknessValue}
        </Paragraph>
        <div>
          <Label htmlFor="thickness-mode">Mode</Label>
          <Select
            id="thickness-mode"
            aria-label="Thickness mode"
            value={draftMode.mode}
            options={[
              { label: "constant", value: "constant" },
              { label: "variable", value: "variable" },
              { label: "pickup", value: "pickup" },
            ]}
            onChange={(event) => {
              const mode = event.target.value as VariableChoice;
              if (mode === "constant") {
                setDraftMode({ mode });
                return;
              }

              if (mode === "variable") {
                setDraftMode({
                  mode,
                  min: String(thicknessValue),
                  max: String(thicknessValue),
                });
                return;
              }

              setDraftMode({
                mode,
                sourceSurfaceIndex: "1",
                scale: "1",
                offset: "0",
              });
            }}
          />
        </div>

        {draftMode.mode === "variable" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="thickness-min">Min.</Label>
              <Input
                id="thickness-min"
                aria-label="Thickness Min."
                value={draftMode.min}
                onChange={(event) => setDraftMode({
                  mode: "variable",
                  min: event.target.value,
                  max: draftMode.max,
                })}
              />
            </div>
            <div>
              <Label htmlFor="thickness-max">Max.</Label>
              <Input
                id="thickness-max"
                aria-label="Thickness Max."
                value={draftMode.max}
                onChange={(event) => setDraftMode({
                  mode: "variable",
                  min: draftMode.min,
                  max: event.target.value,
                })}
              />
            </div>
          </div>
        ) : null}

        {draftMode.mode === "pickup" ? (
          <div className="grid gap-4">
            <div>
              <Label htmlFor="pickup-thickness-source">Source surface index</Label>
              <Input
                id="pickup-thickness-source"
                aria-label="Thickness source surface index"
                value={draftMode.sourceSurfaceIndex}
                onChange={(event) => setDraftMode({
                  mode: "pickup",
                  sourceSurfaceIndex: event.target.value,
                  scale: draftMode.scale,
                  offset: draftMode.offset,
                })}
              />
            </div>
            <div>
              <Label htmlFor="pickup-thickness-scale">scale</Label>
              <Input
                id="pickup-thickness-scale"
                aria-label="Thickness scale"
                value={draftMode.scale}
                onChange={(event) => setDraftMode({
                  mode: "pickup",
                  sourceSurfaceIndex: draftMode.sourceSurfaceIndex,
                  scale: event.target.value,
                  offset: draftMode.offset,
                })}
              />
            </div>
            <div>
              <Label htmlFor="pickup-thickness-offset">offset</Label>
              <Input
                id="pickup-thickness-offset"
                aria-label="Thickness offset"
                value={draftMode.offset}
                onChange={(event) => setDraftMode({
                  mode: "pickup",
                  sourceSurfaceIndex: draftMode.sourceSurfaceIndex,
                  scale: draftMode.scale,
                  offset: event.target.value,
                })}
              />
            </div>
          </div>
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
