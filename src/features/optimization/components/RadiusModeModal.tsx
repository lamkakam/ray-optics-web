"use client";

import React from "react";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import type { RadiusMode, RadiusModeDraft } from "@/features/optimization/stores/optimizationStore";
import { getRadiusLabel, getRadiusValue } from "@/features/optimization/components/optimizationViewModels";
import { Button } from "@/shared/components/primitives/Button";
import { Input } from "@/shared/components/primitives/Input";
import { Label } from "@/shared/components/primitives/Label";
import { Modal } from "@/shared/components/primitives/Modal";
import { Paragraph } from "@/shared/components/primitives/Paragraph";
import { Select } from "@/shared/components/primitives/Select";

type VariableChoice = "constant" | "variable" | "pickup";

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

  const radiusValue = getRadiusValue(optimizationModel, surfaceIndex);

  return (
    <Modal
      isOpen
      title="Radius Variable / Pickup"
      onBackdropClick={onClose}
    >
      <div className="space-y-4">
        <Paragraph>
          {getRadiusLabel(surfaceIndex, optimizationModel)} radius: {radiusValue}
        </Paragraph>
        <div>
          <Label htmlFor="radius-mode">Mode</Label>
          <Select
            id="radius-mode"
            aria-label="Radius mode"
            value={selectedMode.mode}
            options={[
              { label: "constant", value: "constant" },
              { label: "variable", value: "variable" },
              { label: "pickup", value: "pickup" },
            ]}
            onChange={(event) => {
              const mode = event.target.value as VariableChoice;
              if (mode === "constant") {
                onSetMode(surfaceIndex, { mode });
                return;
              }

              if (mode === "variable") {
                onSetMode(surfaceIndex, {
                  mode,
                  min: String(radiusValue),
                  max: String(radiusValue),
                });
                return;
              }

              onSetMode(surfaceIndex, {
                mode,
                sourceSurfaceIndex: "1",
                scale: "1",
                offset: "0",
              });
            }}
          />
        </div>

        {selectedMode.mode === "variable" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="radius-min">Min.</Label>
              <Input
                id="radius-min"
                aria-label="Min."
                value={selectedMode.min}
                onChange={(event) => onSetMode(surfaceIndex, {
                  mode: "variable",
                  min: event.target.value,
                  max: selectedMode.max,
                })}
              />
            </div>
            <div>
              <Label htmlFor="radius-max">Max.</Label>
              <Input
                id="radius-max"
                aria-label="Max."
                value={selectedMode.max}
                onChange={(event) => onSetMode(surfaceIndex, {
                  mode: "variable",
                  min: selectedMode.min,
                  max: event.target.value,
                })}
              />
            </div>
          </div>
        ) : null}

        {selectedMode.mode === "pickup" ? (
          <div className="grid gap-4">
            <div>
              <Label htmlFor="pickup-source">Source surface index</Label>
              <Input
                id="pickup-source"
                aria-label="Source surface index"
                value={selectedMode.sourceSurfaceIndex}
                onChange={(event) => onSetMode(surfaceIndex, {
                  mode: "pickup",
                  sourceSurfaceIndex: event.target.value,
                  scale: selectedMode.scale,
                  offset: selectedMode.offset,
                })}
              />
            </div>
            <div>
              <Label htmlFor="pickup-scale">scale</Label>
              <Input
                id="pickup-scale"
                aria-label="scale"
                value={selectedMode.scale}
                onChange={(event) => onSetMode(surfaceIndex, {
                  mode: "pickup",
                  sourceSurfaceIndex: selectedMode.sourceSurfaceIndex,
                  scale: event.target.value,
                  offset: selectedMode.offset,
                })}
              />
            </div>
            <div>
              <Label htmlFor="pickup-offset">offset</Label>
              <Input
                id="pickup-offset"
                aria-label="offset"
                value={selectedMode.offset}
                onChange={(event) => onSetMode(surfaceIndex, {
                  mode: "pickup",
                  sourceSurfaceIndex: selectedMode.sourceSurfaceIndex,
                  scale: selectedMode.scale,
                  offset: event.target.value,
                })}
              />
            </div>
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
